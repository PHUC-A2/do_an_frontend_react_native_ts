import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch } from '@redux/hooks';
import { completeBiometricSession } from '@redux/slices/authSlice';
import { biometricService } from '@services/BiometricService';
import { storage } from '@utils/storage';
import type { JwtUserDTO } from '@/types/auth.types';

const mapBiometricError = (error?: string): string => {
    switch (error) {
        case 'not_available':
            return 'Thiết bị không hỗ trợ sinh trắc học.';
        case 'not_enrolled':
            return 'Thiết bị chưa cài Face ID/Vân tay.';
        case 'user_cancel':
        case 'system_cancel':
        case 'app_cancel':
            return 'Bạn đã hủy xác thực sinh trắc học.';
        case 'lockout':
            return 'Face ID/Vân tay bị khóa tạm thời. Vui lòng mở khóa bằng mã máy rồi thử lại.';
        case 'user_fallback':
            return 'Bạn đã chọn đăng nhập bằng mã máy.';
        case 'authentication_failed':
            return 'Face ID/Vân tay không khớp. Vui lòng thử lại.';
        default:
            return `Xác thực sinh trắc học không thành công${error ? ` (${error})` : ''}.`;
    }
};

/**
 * Hook đăng nhập / bật sinh trắc học.
 * Chỉ làm việc với JWT đã lưu trong SecureStore — không lưu mật khẩu.
 */
export function useBiometric() {
    const dispatch = useAppDispatch();

    const getBiometricEnabled = useCallback(async (): Promise<boolean> => {
        return storage.getBiometricLoginEnabled();
    }, []);

    /** Sau khi người dùng xác thực sinh trắc học thành công — nạp session từ storage (token + user đã có). */
    const handleBiometricLogin = useCallback(async (): Promise<boolean> => {
        try {
            const [canOffer, biometricEnabled, user, token] = await Promise.all([
                biometricService.canOfferBiometricLogin(),
                storage.getBiometricLoginEnabled(),
                storage.getUser<JwtUserDTO>(),
                storage.getAccessToken(),
            ]);

            if (!canOffer) {
                throw new Error('Thiết bị chưa sẵn sàng Face ID/Vân tay hoặc bạn chưa đăng ký sinh trắc học trong máy.');
            }
            if (!biometricEnabled) {
                throw new Error('Bạn chưa bật đăng nhập bằng sinh trắc học.');
            }
            if (!user || !token) {
                throw new Error('Phiên đăng nhập nhanh đã hết. Vui lòng đăng nhập bằng mật khẩu để bật lại.');
            }

            const result = await biometricService.authenticateDetailed({
                promptMessage: 'Đăng nhập bằng sinh trắc học',
                cancelLabel: 'Hủy',
                fallbackLabel: '',
                disableDeviceFallback: Platform.OS === 'ios',
            });
            if (!result.success) {
                console.log('[BiometricLogin] failed', JSON.stringify(result));
                throw new Error(mapBiometricError(result.error));
            }

            dispatch(completeBiometricSession(user));
            return true;
        } catch (err: any) {
            console.log('[BiometricLogin] error', err?.message ?? err);
            throw err;
        }
    }, [dispatch]);

    /**
     * Bật đăng nhập nhanh: xác thực sinh trắc học rồi gắn cờ (JWT đã được loginAsync lưu sẵn).
     */
    const handleEnableBiometric = useCallback(async (): Promise<boolean> => {
        try {
            const can = await biometricService.canOfferBiometricLogin();
            if (!can) throw new Error('Thiết bị không sẵn sàng để bật đăng nhập sinh trắc học.');

            const result = await biometricService.authenticateDetailed({
                promptMessage: 'Xác nhận để bật đăng nhập nhanh',
                cancelLabel: 'Hủy',
                // Bước bật tính năng: cho phép iOS dùng passcode fallback để giảm trường hợp fail giả.
                disableDeviceFallback: false,
            });
            if (!result.success) {
                console.log('[BiometricEnable] failed', JSON.stringify(result));
                throw new Error(mapBiometricError(result.error));
            }

            await storage.setBiometricLoginEnabled(true);
            return true;
        } catch (err: any) {
            console.log('[BiometricEnable] error', err?.message ?? err);
            throw err;
        }
    }, []);

    const handleDisableBiometric = useCallback(async (): Promise<void> => {
        await storage.setBiometricLoginEnabled(false);
    }, []);

    return { handleBiometricLogin, handleEnableBiometric, handleDisableBiometric, getBiometricEnabled };
}
