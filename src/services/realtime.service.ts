import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '@config/api.config';
import { store } from '@redux/store';
import { storage } from '@utils/storage';
import type { ResNotificationDTO } from '@/types/notification.types';
import { fetchMyBookings } from '@redux/slices/bookingSlice';
import { prependNotification } from '@redux/slices/notificationSlice';
import { clearRealtimeState, pushRealtimeEvent, setRealtimeConnectionState } from '@redux/slices/realtimeSlice';
import { ANDROID_CHANNEL_ID } from './notification.service';

type SocketEnvelope =
    | { event?: 'connected' | 'pong' | 'ring'; data?: string }
    | { event?: 'notification'; data?: ResNotificationDTO };

const TITLE_MAP: Partial<Record<ResNotificationDTO['type'], string>> = {
    BOOKING_CREATED: 'Đặt sân thành công',
    BOOKING_PENDING_CONFIRMATION: 'Yêu cầu đặt sân mới',
    BOOKING_APPROVED: 'Booking đã được xác nhận',
    BOOKING_REJECTED: 'Booking đã bị từ chối',
    EQUIPMENT_BORROWED: 'Mượn thiết bị',
    EQUIPMENT_RETURNED: 'Trả thiết bị',
    EQUIPMENT_LOST: 'Báo mất thiết bị',
    EQUIPMENT_DAMAGED: 'Thiết bị bị hỏng',
    PAYMENT_REQUESTED: 'Yêu cầu thanh toán',
    PAYMENT_PROOF_UPLOADED: 'Đã tải minh chứng thanh toán',
    PAYMENT_CONFIRMED: 'Thanh toán đã xác nhận',
    PAYMENT_SUCCESS: 'Thanh toán thành công',
    PAYMENT_FAILED: 'Thanh toán thất bại',
    MATCH_REMINDER: 'Sắp đến giờ đá',
    AI_KEY_EXPIRED: 'Cảnh báo hệ thống',
    REVIEW_REPLY: 'Phản hồi đánh giá',
    SYSTEM: 'Thông báo mới',
};

class RealtimeService {
    private socket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private failures = 0;
    private manuallyStopped = false;

    private buildSocketUrl(token: string) {
        const httpUrl = new URL(API_BASE_URL);
        const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const basePath = httpUrl.pathname.replace(/\/api\/v1\/?$/, '');
        const path = `${basePath || ''}/ws/notifications`.replace(/\/{2,}/g, '/');
        return `${protocol}//${httpUrl.host}${path}?token=${encodeURIComponent(token)}`;
    }

    private clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private async showForegroundNotification(notification: ResNotificationDTO) {
        if (AppState.currentState !== 'active') return;
        const title = TITLE_MAP[notification.type] ?? 'TUB Sport';
        const body = notification.message?.trim() || 'Bạn có cập nhật mới.';
        const isPaymentType = [
            'PAYMENT_REQUESTED',
            'PAYMENT_PROOF_UPLOADED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
        ].includes(notification.type);
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                channelId: ANDROID_CHANNEL_ID,
                data: {
                    ...notification,
                    bookingId: notification.referenceId ?? undefined,
                    screen: isPaymentType ? 'paymentqr' : 'bookingdetail',
                    targetTab: 'MyBookings',
                    __source: 'local-ws',
                },
            },
            trigger: null,
        });
    }

    private async showRingNotification() {
        if (AppState.currentState !== 'active') return;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'TUB Sport',
                body: 'Bạn có cập nhật mới.',
                sound: 'default',
                channelId: ANDROID_CHANNEL_ID,
                data: { __source: 'local-ws', targetTab: 'Notifications' },
            },
            trigger: null,
        });
    }

    private handleNotification(notification: ResNotificationDTO) {
        store.dispatch(prependNotification(notification));
        store.dispatch(pushRealtimeEvent({
            event: 'notification',
            notification,
            receivedAt: Date.now(),
        }));

        const refreshTypes: ResNotificationDTO['type'][] = [
            'BOOKING_CREATED',
            'BOOKING_PENDING_CONFIRMATION',
            'BOOKING_APPROVED',
            'BOOKING_REJECTED',
            'BOOKING_CONFIRMED',
            'BOOKING_CANCELLED',
            'BOOKING_COMPLETED',
            'EQUIPMENT_BORROWED',
            'EQUIPMENT_RETURNED',
            'EQUIPMENT_LOST',
            'EQUIPMENT_DAMAGED',
            'PAYMENT_REQUESTED',
            'PAYMENT_PROOF_UPLOADED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
            'MATCH_REMINDER',
        ];

        if (refreshTypes.includes(notification.type)) {
            void store.dispatch(fetchMyBookings(undefined));
        }

        void this.showForegroundNotification(notification);
    }

    private handleMessage(raw: string) {
        try {
            const payload = JSON.parse(raw) as SocketEnvelope;
            if (payload.event === 'notification' && payload.data && typeof payload.data !== 'string') {
                this.handleNotification(payload.data);
                return;
            }
            if (payload.event === 'ring') {
                store.dispatch(pushRealtimeEvent({ event: 'ring', receivedAt: Date.now() }));
                void this.showRingNotification();
                return;
            }
            if (payload.event === 'connected' || payload.event === 'pong') {
                store.dispatch(pushRealtimeEvent({ event: payload.event, receivedAt: Date.now() }));
            }
        } catch {
            // ignore malformed payload
        }
    }

    private scheduleReconnect() {
        if (this.manuallyStopped) return;
        this.clearTimers();
        this.failures += 1;
        const retryDelay = Math.min(30000, 1000 * Math.pow(2, Math.min(this.failures, 5)));
        this.reconnectTimer = setTimeout(() => {
            void this.start();
        }, retryDelay);
    }

    async start() {
        const token = await storage.getAccessToken();
        if (!token) {
            this.stop();
            return;
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.manuallyStopped = false;
        store.dispatch(setRealtimeConnectionState('connecting'));
        const ws = new WebSocket(this.buildSocketUrl(token));
        this.socket = ws;

        ws.onopen = () => {
            this.failures = 0;
            store.dispatch(setRealtimeConnectionState('connected'));
            this.clearTimers();
            this.pingTimer = setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send('ping');
                }
            }, 25000);
        };

        ws.onmessage = (event) => {
            this.handleMessage(String(event.data ?? ''));
        };

        ws.onerror = () => {
            ws.close();
        };

        ws.onclose = () => {
            if (this.socket === ws) {
                this.socket = null;
            }
            store.dispatch(setRealtimeConnectionState('disconnected'));
            this.scheduleReconnect();
        };
    }

    stop() {
        this.manuallyStopped = true;
        this.clearTimers();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        store.dispatch(clearRealtimeState());
    }
}

export const realtimeService = new RealtimeService();
