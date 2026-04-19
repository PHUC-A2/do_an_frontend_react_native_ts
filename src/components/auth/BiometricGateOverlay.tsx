import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '@redux/hooks';
import { hardLogoutAsync } from '@redux/slices/authSlice';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import { useBiometric } from '@hooks/useBiometric';
import { biometricService } from '@services/BiometricService';

/**
 * Màn khóa khi mở app: đã bật đăng nhập nhanh + có JWT — bắt buộc Face ID / vân tay hoặc đăng nhập lại bằng mật khẩu.
 */
export default function BiometricGateOverlay() {
    const { colors } = useTheme();
    const dispatch = useAppDispatch();
    const { handleBiometricLogin } = useBiometric();
    const [kind, setKind] = useState<'face' | 'fingerprint' | 'unknown'>('unknown');
    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const startedRef = useRef(false);

    useEffect(() => {
        void biometricService.getSupportedKind().then(setKind);
    }, []);

    const runUnlock = useCallback(async () => {
        setBusy(true);
        setErrorMessage(null);
        try {
            const ok = await handleBiometricLogin();
            if (!ok) {
                setErrorMessage('Xác thực sinh trắc học không thành công. Vui lòng thử lại.');
            }
        } catch (err: any) {
            setErrorMessage(err?.message ?? 'Không thể xác thực sinh trắc học.');
        } finally {
            setBusy(false);
        }
    }, [handleBiometricLogin]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void runUnlock();
    }, [runUnlock]);

    const onUsePassword = useCallback(() => {
        void dispatch(hardLogoutAsync());
    }, [dispatch]);

    const iconName = kind === 'face' ? 'scan-outline' : 'finger-print-outline';
    const headline =
        kind === 'face' ? 'Xác thực bằng Face ID' : kind === 'fingerprint' ? 'Sử dụng vân tay để đăng nhập' : 'Đăng nhập bằng sinh trắc học';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center' }}>
                <View style={{ alignItems: 'center', marginBottom: SPACING.xxl }}>
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 28,
                            backgroundColor: colors.primaryLight,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: SPACING.lg,
                        }}
                    >
                        <Ionicons name={iconName} size={48} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.hero, fontWeight: FONT_WEIGHT.extrabold, color: colors.textPrimary, textAlign: 'center' }}>
                        TUB Sport
                    </Text>
                    <Text
                        style={{
                            fontSize: FONT_SIZE.lg,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: SPACING.md,
                        }}
                    >
                        {headline}
                    </Text>
                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textHint, textAlign: 'center', marginTop: SPACING.sm }}>
                        Đăng nhập nhanh và an toàn hơn
                    </Text>
                </View>

                {busy && (
                    <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ marginTop: SPACING.sm, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Đang chờ xác thực...</Text>
                    </View>
                )}

                {!!errorMessage && (
                    <Text
                        style={{
                            fontSize: FONT_SIZE.sm,
                            color: colors.danger,
                            textAlign: 'center',
                            marginBottom: SPACING.md,
                        }}
                    >
                        {errorMessage}
                    </Text>
                )}

                <TouchableOpacity
                    onPress={() => void runUnlock()}
                    disabled={busy}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.sm,
                        backgroundColor: colors.primary,
                        paddingVertical: SPACING.md,
                        borderRadius: 14,
                        opacity: busy ? 0.65 : 1,
                    }}
                >
                    <Ionicons name="lock-open-outline" size={22} color={colors.textInverse} />
                    <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textInverse }}>
                        Thử lại
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onUsePassword}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.xs,
                        marginTop: SPACING.md,
                        paddingVertical: SPACING.md,
                    }}
                >
                    <Ionicons name="key-outline" size={20} color={colors.primary} />
                    <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.primary }}>
                        Đăng nhập bằng mật khẩu
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
