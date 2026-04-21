import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResNotificationDTO } from '@/types/notification.types';
import { RestResponse } from '@/types/common.types';

export const ANDROID_CHANNEL_ID = 'tub-sport-alerts-v2';
const BACKGROUND_NOTIFICATION_TASK = 'tub-sport-background-notification';

// Event -> Backend
// ├── WebSocket -> Web
// └── FCM/APNs -> Mobile
//
// Web dùng socket vì đang online liên tục ở browser.
// Mobile ưu tiên push vì vẫn nhận được khi app background / killed.
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const source = notification.request.content.data?.__source;
        const isRealtimeBanner = source === 'local-ws-notification' || source === 'local-ws';
        const isRealtimeRing = source === 'local-ws-ring';
        return {
            shouldShowBanner: isRealtimeBanner,
            shouldShowList: isRealtimeBanner,
            shouldPlaySound: isRealtimeRing,
            shouldSetBadge: false,
        };
    },
});

if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) {
            console.log('[push][background][error]', error.message);
            return;
        }
        console.log('[push][background]', JSON.stringify(data ?? {}));
    });
}

export type PushNavigationPayload = {
    screen?: string;
    bookingId?: string | number;
    paymentId?: string | number;
    pitchId?: string | number;
    targetTab?: string;
    type?: string;
    [key: string]: unknown;
};

type RuntimeOptions = {
    onNotificationReceived?: (notification: Notifications.Notification, payload: PushNavigationPayload) => void;
    onNotificationResponse?: (response: Notifications.NotificationResponse, payload: PushNavigationPayload) => void;
};

let runtimeCleanup: (() => void) | null = null;
let lastUploadedToken: string | null = null;

function normalizePayload(data: Record<string, unknown> | undefined): PushNavigationPayload {
    const payload: PushNavigationPayload = { ...(data ?? {}) };
    const type = typeof payload.type === 'string' ? payload.type : '';
    if (!payload.targetTab) {
        if (type.startsWith('BOOKING') || type.startsWith('PAYMENT') || type.startsWith('EQUIPMENT') || type === 'MATCH_REMINDER') {
            payload.targetTab = 'MyBookings';
        } else if (type === 'SYSTEM' || type === 'AI_KEY_EXPIRED') {
            payload.targetTab = 'Notifications';
        }
    }
    return payload;
}

async function ensureAndroidChannelAsync() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Thông báo chung',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 120, 250],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

/** Expo Go Android (SDK 53+): remote FCM không còn được hỗ trợ — chỉ development/standalone build. */
function isExpoGoAndroid(): boolean {
    return Constants.appOwnership === 'expo' && Platform.OS === 'android';
}

async function registerBackgroundTaskAsync() {
    if (isExpoGoAndroid()) {
        return;
    }
    try {
        const taskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
        if (!taskRegistered) {
            await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        }
    } catch (error) {
        console.log('[push] register background task skipped', error);
    }
}

async function requestNotificationPermissionAsync() {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
    }
    const next = await Notifications.requestPermissionsAsync({
        ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
        },
    });
    return next.granted || next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function uploadTokenToBackend(token: string) {
    if (!token || token === lastUploadedToken) return;
    try {
        await api.post<RestResponse<null>>(ENDPOINTS.DEVICES.REGISTER_TOKEN, { token });
        lastUploadedToken = token;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            await api.post<RestResponse<null>>('/client/notifications/fcm-token', { token });
            lastUploadedToken = token;
            return;
        }
        throw error;
    }
}

export const notificationService = {
    // GET /client/notifications → trả về mảng trực tiếp (không paginate)
    getMyNotifications: () =>
        api.get<RestResponse<ResNotificationDTO[]>>(ENDPOINTS.NOTIFICATIONS.MY),

    markAsRead: (id: number) =>
        api.patch<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.READ(id)),

    markAllAsRead: () =>
        api.patch<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.READ_ALL),

    deleteOne: (id: number) =>
        api.delete<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.DELETE(id)),

    deleteAll: () =>
        api.delete<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.CLEAR),

    async initializeNotificationRuntime(options: RuntimeOptions = {}) {
        if (runtimeCleanup) return runtimeCleanup;

        await ensureAndroidChannelAsync();
        await registerBackgroundTaskAsync();

        const handleResponse = (response: Notifications.NotificationResponse) => {
            const payload = normalizePayload(response.notification.request.content.data as Record<string, unknown> | undefined);
            options.onNotificationResponse?.(response, payload);
        };

        const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
            const payload = normalizePayload(notification.request.content.data as Record<string, unknown> | undefined);
            options.onNotificationReceived?.(notification, payload);
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
            handleResponse(lastResponse);
        }

        runtimeCleanup = () => {
            receiveSubscription.remove();
            responseSubscription.remove();
            runtimeCleanup = null;
        };

        return runtimeCleanup;
    },

    async registerPushTokenForCurrentUser() {
        await ensureAndroidChannelAsync();

        if (isExpoGoAndroid()) {
            console.log(
                '[push] Bỏ qua đăng ký FCM trên Expo Go Android (SDK 53+ không hỗ trợ remote push). Chạy `npx expo run:android` hoặc EAS dev build để thử push.',
            );
            return null;
        }

        if (!Device.isDevice) {
            console.log('[push] Bỏ qua đăng ký token trên simulator / emulator');
            return null;
        }

        const granted = await requestNotificationPermissionAsync();
        if (!granted) {
            console.log('[push] User từ chối quyền notification');
            return null;
        }

        const nativeToken = await Notifications.getDevicePushTokenAsync();
        const token = typeof nativeToken.data === 'string' ? nativeToken.data : String(nativeToken.data ?? '');

        if (!token) {
            console.log('[push] Không lấy được device push token');
            return null;
        }

        await uploadTokenToBackend(token);
        console.log(`[push] Registered ${Platform.OS} token: ${token}`);
        return token;
    },

    getNavigationPayloadFromResponse(response: Notifications.NotificationResponse) {
        return normalizePayload(response.notification.request.content.data as Record<string, unknown> | undefined);
    },

    getNavigationPayloadFromNotification(notification: Notifications.Notification) {
        return normalizePayload(notification.request.content.data as Record<string, unknown> | undefined);
    },
};
