import * as SecureStore from 'expo-secure-store';

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user_info',
    PENDING_VERIFICATION: 'pending_verification',
    /** Đã bật đăng nhập nhanh bằng Face ID / vân tay (JWT vẫn dùng key ACCESS_TOKEN). */
    BIOMETRIC_LOGIN_ENABLED: 'biometric_login_enabled',
} as const;

export const storage = {
    async setAccessToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
    },

    async getAccessToken(): Promise<string | null> {
        return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    },

    async removeAccessToken(): Promise<void> {
        await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    },

    async setUser(user: object): Promise<void> {
        await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
    },

    async getUser<T>(): Promise<T | null> {
        const raw = await SecureStore.getItemAsync(KEYS.USER);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    async removeUser(): Promise<void> {
        await SecureStore.deleteItemAsync(KEYS.USER);
    },

    async getBiometricLoginEnabled(): Promise<boolean> {
        const v = await SecureStore.getItemAsync(KEYS.BIOMETRIC_LOGIN_ENABLED);
        return v === 'true';
    },

    async setBiometricLoginEnabled(enabled: boolean): Promise<void> {
        if (enabled) {
            await SecureStore.setItemAsync(KEYS.BIOMETRIC_LOGIN_ENABLED, 'true');
        } else {
            await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_LOGIN_ENABLED);
        }
    },

    async clearAll(): Promise<void> {
        await Promise.all([
            SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
            SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
            SecureStore.deleteItemAsync(KEYS.USER),
            SecureStore.deleteItemAsync(KEYS.BIOMETRIC_LOGIN_ENABLED),
        ]);
    },

    async setPendingVerification(data: { userId: number; email: string }): Promise<void> {
        await SecureStore.setItemAsync(KEYS.PENDING_VERIFICATION, JSON.stringify(data));
    },

    async getPendingVerification(): Promise<{ userId: number; email: string } | null> {
        const raw = await SecureStore.getItemAsync(KEYS.PENDING_VERIFICATION);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as { userId: number; email: string };
        } catch {
            return null;
        }
    },

    async clearPendingVerification(): Promise<void> {
        await SecureStore.deleteItemAsync(KEYS.PENDING_VERIFICATION);
    },
};
