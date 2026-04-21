import { ENV } from './env';

export const API_BASE_URL = ENV.API_BASE_URL;

export const ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        VERIFY_EMAIL: '/auth/verify-email',
        RESEND_OTP: '/auth/resend-otp',
        RESEND_OTP_BY_EMAIL: '/auth/resend-otp-by-email',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        ACCOUNT: '/auth/account',
    },
    // Pitches
    PITCHES: {
        LIST: '/pitches',
        DETAIL: (id: number) => `/pitches/${id}`,
        TIMELINE: (id: number) => `/client/public/pitches/${id}/timeline`,
        PUBLIC: '/pitches',
    },
    // Bookings
    BOOKINGS: {
        CREATE: '/bookings',
        MY: '/client/bookings',
        DETAIL: (id: number) => `/bookings/${id}`,
        CANCEL: (id: number) => `/client/bookings/${id}/cancel`,
        DELETE: (id: number) => `/client/bookings/${id}`,
        ALL: '/bookings',
        UPDATE: (id: number) => `/bookings/${id}`,
        UPDATE_CLIENT: (id: number) => `/client/bookings/${id}`,
    },
    // Booking Equipment (client)
    BOOKING_EQUIPMENT: {
        MY: '/client/booking-equipments',
        BY_BOOKING: (bookingId: number) => `/client/booking-equipments/booking/${bookingId}`,
        UPDATE_STATUS: (id: number) => `/client/booking-equipments/${id}/status`,
        DELETE: (id: number) => `/client/booking-equipments/${id}`,
        CREATE: '/client/booking-equipments',
    },
    // Pitch Equipment (public)
    PITCH_EQUIPMENT: {
        ALL: (pitchId: number) => `/client/public/pitches/${pitchId}/pitch-equipments`,
        BORROWABLE: (pitchId: number) => `/client/public/pitches/${pitchId}/pitch-equipments/borrowable`,
    },
    // Files
    FILES: {
        UPLOAD: '/files/upload',
    },
    // Payments
    PAYMENTS: {
        CREATE: '/client/payments',
        QR: (paymentCode: string) => `/client/payments/${paymentCode}/qr`,
        /** Lấy payment PENDING theo bookingId — phục hồi QR khi reload */
        PENDING_BY_BOOKING: (bookingId: number) => `/client/payments/booking/${bookingId}`,
        ATTACH_PROOF: (paymentId: number) => `/client/payments/${paymentId}/proof`,
        MY: '/client/payments',
    },
    // Notifications
    NOTIFICATIONS: {
        MY: '/client/notifications',
        READ: (id: number) => `/client/notifications/${id}/read`,
        READ_ALL: '/client/notifications/read-all',
        DELETE: (id: number) => `/client/notifications/${id}`,
        CLEAR: '/client/notifications/clear',
    },
    DEVICES: {
        REGISTER_TOKEN: '/devices/register-token',
    },
    // Equipment
    EQUIPMENT: {
        LIST: '/admin/equipment',
        DETAIL: (id: number) => `/admin/equipment/${id}`,
        CREATE: '/admin/equipment',
        UPDATE: (id: number) => `/admin/equipment/${id}`,
        DELETE: (id: number) => `/admin/equipment/${id}`,
        PUBLIC: '/public/equipment',
    },
    // Reviews
    REVIEWS: {
        LIST: '/reviews',
        MY: '/reviews/my',
        CREATE: '/reviews',
        DETAIL: (id: number) => `/reviews/${id}`,
    },
    // Users (admin)
    USERS: {
        LIST: '/admin/users',
        DETAIL: (id: number) => `/admin/users/${id}`,
        CREATE: '/admin/users',
        UPDATE: (id: number) => `/admin/users/${id}`,
        STATUS: (id: number) => `/admin/users/${id}/status`,
    },
    // Dashboard
    DASHBOARD: {
        OVERVIEW: '/admin/dashboard/overview',
        REVENUE: '/admin/revenue',
    },
    // System config
    SYSTEM_CONFIG: {
        BANK_ACCOUNT: '/admin/system-config/bank-account',
        PUBLIC_BANK: '/public/system-config/bank-info',
        MESSENGER: '/admin/system-config/messenger',
        PUBLIC_MESSENGER: '/client/public/system-config/messenger',
    },
    AI: {
        CLIENT_CHAT: '/client/ai/chat',
    },
};
