import * as LocalAuthentication from 'expo-local-authentication';

type BiometricAuthResult = {
    success: boolean;
    error?: string;
    warning?: string;
};

/**
 * Sinh trắc học thiết bị (Face ID / vân tay) — bọc expo-local-authentication để dễ test & tái sử dụng.
 */
export const biometricService = {
    /** Thiết bị có phần cứng sinh trắc học (cảm biến Face ID / vân tay). */
    async hasHardware(): Promise<boolean> {
        return LocalAuthentication.hasHardwareAsync();
    },

    /** Người dùng đã đăng ký ít nhất một dấu vân tay / khuôn mặt trên máy. */
    async isEnrolled(): Promise<boolean> {
        return LocalAuthentication.isEnrolledAsync();
    },

    /**
     * Gọi hộp thoại xác thực hệ thống.
     * @returns true nếu xác thực thành công
     */
    async authenticateDetailed(options?: {
        promptMessage?: string;
        cancelLabel?: string;
        /** iOS: ẩn nút "Use Passcode" trong biometric prompt */
        fallbackLabel?: string;
        /** true = không cho dùng mã PIN hệ thống iOS làm dự phòng (dùng cho màn khóa app). */
        disableDeviceFallback?: boolean;
    }): Promise<BiometricAuthResult> {
        const hardware = await this.hasHardware();
        const enrolled = await this.isEnrolled();
        if (!hardware) return { success: false, error: 'not_available' };
        if (!enrolled) return { success: false, error: 'not_enrolled' };

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: options?.promptMessage ?? 'Xác thực danh tính',
                cancelLabel: options?.cancelLabel ?? 'Hủy',
                ...(options?.fallbackLabel !== undefined ? { fallbackLabel: options.fallbackLabel } : {}),
                disableDeviceFallback: options?.disableDeviceFallback ?? false,
            });
            return {
                success: result.success,
                error: result.success ? undefined : result.error,
                warning: 'warning' in result ? result.warning : undefined,
            };
        } catch (err: any) {
            return {
                success: false,
                error: err?.message ?? 'biometric_exception',
            };
        }
    },

    async authenticate(options?: {
        promptMessage?: string;
        cancelLabel?: string;
        fallbackLabel?: string;
        disableDeviceFallback?: boolean;
    }): Promise<boolean> {
        const result = await this.authenticateDetailed(options);
        return result.success;
    },

    /** Các kiểu sinh trắc học OS hỗ trợ — để chọn icon / copy phù hợp. */
    async getSupportedKind(): Promise<'face' | 'fingerprint' | 'unknown'> {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'face';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'face';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'fingerprint';
        }
        return 'unknown';
    },

    /** Có thể dùng đăng nhập nhanh (có phần cứng + đã đăng ký). */
    async canOfferBiometricLogin(): Promise<boolean> {
        return (await this.hasHardware()) && (await this.isEnrolled());
    },
};
