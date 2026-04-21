import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type NotificationNavigationPayload = {
    screen?: string;
    bookingId?: string | number;
    paymentId?: string | number;
    pitchId?: string | number;
    targetTab?: string;
};

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function navigateFromNotificationPayload(payload: NotificationNavigationPayload) {
    if (!navigationRef.isReady()) return;

    const bookingId = toNumber(payload.bookingId);
    const paymentId = toNumber(payload.paymentId);
    const pitchId = toNumber(payload.pitchId);
    const screen = typeof payload.screen === 'string' ? payload.screen.toLowerCase() : '';

    if ((screen === 'payment' || screen === 'paymentqr') && bookingId) {
        navigationRef.navigate('Client', {
            screen: 'PaymentQR',
            params: { bookingId },
        });
        return;
    }

    if (bookingId) {
        navigationRef.navigate('Client', {
            screen: 'BookingDetail',
            params: { bookingId },
        });
        return;
    }

    if (paymentId) {
        navigationRef.navigate('Client', {
            screen: 'PaymentQR',
            params: { bookingId: paymentId },
        });
        return;
    }

    if (pitchId) {
        navigationRef.navigate('Client', {
            screen: 'PitchDetail',
            params: { pitchId },
        });
        return;
    }

    const tab = payload.targetTab === 'Notifications'
        || payload.targetTab === 'MyBookings'
        || payload.targetTab === 'Pitches'
        || payload.targetTab === 'Profile'
        || payload.targetTab === 'Home'
        ? payload.targetTab
        : 'Notifications';

    navigationRef.navigate('Client', {
        screen: 'ClientTabs',
        params: { screen: tab },
    });
}
