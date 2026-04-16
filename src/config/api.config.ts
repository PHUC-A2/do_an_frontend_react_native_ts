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
        MY: '/bookings/my',
        DETAIL: (id: number) => `/bookings/${id}`,
        CANCEL: (id: number) => `/bookings/${id}/cancel`,
        ALL: '/admin/bookings',
        UPDATE: (id: number) => `/admin/bookings/${id}`,
    },
    // Payments
    PAYMENTS: {
        CREATE: '/payments',
        QR: (id: number) => `/payments/${id}/qr`,
        CONFIRM: (id: number) => `/payments/${id}/confirm`,
        MY: '/payments/my',
    },
    // Notifications
    NOTIFICATIONS: {
        MY: '/notifications/my',
        READ: (id: number) => `/notifications/${id}/read`,
        READ_ALL: '/notifications/my/read-all',
        UNREAD_COUNT: '/notifications/my/unread-count',
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
        PUBLIC_MESSENGER: '/public/system-config/messenger',
    },
    AI: {
        CLIENT_CHAT: '/client/ai/chat',
    },
};
