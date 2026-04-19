import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@hooks/useToast';
import { loginAsync } from '@redux/slices/authSlice';
import { authService } from '@services/auth.service';
import { AuthScreenProps } from '@navigation/types';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';
import { isValidEmail, isValidPassword } from '@utils/helpers';
import BiometricPromptModal from '@components/auth/BiometricPromptModal';
import type { BiometricKind } from '@components/auth/BiometricPromptModal';
import { useBiometric } from '@hooks/useBiometric';
import { biometricService } from '@services/BiometricService';
import { storage } from '@utils/storage';

type Props = AuthScreenProps<'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const { login, isLoading, error, dismissError, isAuthenticated } = useAuth();
    const { handleEnableBiometric, handleBiometricLogin } = useBiometric();
    const toast = useToast();
    const { colors } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [biometricOfferOpen, setBiometricOfferOpen] = useState(false);
    const [biometricKind, setBiometricKind] = useState<BiometricKind>('unknown');
    const [enableBioLoading, setEnableBioLoading] = useState(false);
    const [quickBioEnabled, setQuickBioEnabled] = useState(false);
    const [quickBioLoading, setQuickBioLoading] = useState(false);
    const [shouldCloseScreen, setShouldCloseScreen] = useState(false);
    const quickLoginMethodLabel = Platform.OS === 'ios' ? 'Face ID' : 'vân tay';
    const quickLoginIconName = Platform.OS === 'ios' ? 'scan-outline' : 'finger-print-outline';

    // Đóng modal Auth sau khi xong luồng đăng nhập (kể cả hộp thoại bật sinh trắc học)
    useEffect(() => {
        if (isAuthenticated && shouldCloseScreen) {
            navigation.getParent()?.goBack();
            setShouldCloseScreen(false);
        }
    }, [isAuthenticated, shouldCloseScreen, navigation]);

    useEffect(() => {
        if (error) {
            if (error.includes('chưa xác thực')) {
                setUnverifiedEmail(email.trim());
            }
            toast.error(error);
            dismissError();
        }
    }, [error]);

    useEffect(() => {
        void (async () => {
            const [enabled, canOffer, kind] = await Promise.all([
                storage.getBiometricLoginEnabled(),
                biometricService.canOfferBiometricLogin(),
                biometricService.getSupportedKind(),
            ]);
            setBiometricKind(kind);
            setQuickBioEnabled(enabled && canOffer);
        })();
    }, []);

    const handleGoVerify = async () => {
        const targetEmail = (unverifiedEmail ?? email).trim();
        if (!targetEmail) {
            toast.error('Nhập email của bạn vào ô bên trên rồi thử lại');
            return;
        }
        setVerifying(true);
        try {
            const res = await authService.resendOtpByEmail(targetEmail);
            const { userId, email: verifyEmail } = res.data.data!.message;
            toast.success('OTP đã gửi, vui lòng kiểm tra hộp thư');
            setUnverifiedEmail(null);
            navigation.navigate('VerifyEmail', { userId, email: verifyEmail });
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? err?.message ?? 'Gửi OTP thất bại');
        } finally {
            setVerifying(false);
        }
    };

    const validate = (): boolean => {
        let valid = true;
        if (!isValidEmail(email)) {
            setEmailError('Email không hợp lệ');
            valid = false;
        } else {
            setEmailError('');
        }
        if (!isValidPassword(password)) {
            setPasswordError('Mật khẩu ít nhất 6 ký tự');
            valid = false;
        } else {
            setPasswordError('');
        }
        return valid;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        const result = await login({ username: email.trim(), password });
        if (loginAsync.fulfilled.match(result)) {
            toast.success('Đăng nhập thành công');
            const [canOffer, enabled] = await Promise.all([
                biometricService.canOfferBiometricLogin(),
                storage.getBiometricLoginEnabled(),
            ]);
            const kind = await biometricService.getSupportedKind();
            setBiometricKind(kind);
            if (canOffer && !enabled) {
                setBiometricOfferOpen(true);
            } else {
                setQuickBioEnabled(canOffer && enabled);
                setShouldCloseScreen(true);
            }
        }
    };

    const finishAuthModal = () => {
        setBiometricOfferOpen(false);
        setShouldCloseScreen(true);
    };

    const handleQuickBiometricPress = async () => {
        setQuickBioLoading(true);
        setShouldCloseScreen(true);
        try {
            const ok = await handleBiometricLogin();
            if (!ok) {
                setShouldCloseScreen(false);
                toast.error(`Xác thực ${quickLoginMethodLabel} thất bại. Vui lòng thử lại.`);
            }
        } catch (err: any) {
            setShouldCloseScreen(false);
            toast.error(err?.message ?? `Không thể đăng nhập bằng ${quickLoginMethodLabel}.`);
        } finally {
            setQuickBioLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <BiometricPromptModal
                visible={biometricOfferOpen}
                biometricKind={biometricKind}
                loading={enableBioLoading}
                onCancel={finishAuthModal}
                onConfirm={async () => {
                    setEnableBioLoading(true);
                    try {
                        const ok = await handleEnableBiometric();
                        if (ok) {
                            toast.success('Đã bật đăng nhập nhanh');
                            setQuickBioEnabled(true);
                        } else {
                            toast.error(`Không thể bật ${quickLoginMethodLabel}. Bạn vẫn có thể đăng nhập bằng email và mật khẩu.`);
                        }
                    } catch (err: any) {
                        toast.error(err?.message ?? `Không thể bật ${quickLoginMethodLabel}.`);
                    } finally {
                        setEnableBioLoading(false);
                        finishAuthModal();
                    }
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.section }} keyboardShouldPersistTaps="handled">
                    {/* Logo */}
                    <View style={{ alignItems: 'center', paddingTop: SPACING.section, paddingBottom: SPACING.xxl }}>
                        <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
                            <Ionicons name="football" size={48} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: FONT_SIZE.xxxl, fontWeight: FONT_WEIGHT.extrabold, color: colors.textPrimary }}>TUB Sport</Text>
                        <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, marginTop: SPACING.xs }}>Đặt sân bóng dễ dàng</Text>
                    </View>

                    {/* Form */}
                    <View style={[{ backgroundColor: colors.surface, borderRadius: 20, padding: SPACING.xxl }, SHADOW.md]}>
                        <Text style={{ fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xxl }}>Đăng nhập</Text>

                        {unverifiedEmail && (
                            <View style={{ backgroundColor: colors.primaryLight, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                                <Ionicons name="mail-unread-outline" size={20} color={colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>
                                        Tài khoản chưa xác thực
                                    </Text>
                                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }}>
                                        Nhấn nút bên dưới để nhận OTP xác thực
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={handleGoVerify} disabled={verifying}
                                    style={{ backgroundColor: colors.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 8 }}>
                                    <Text style={{ fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: FONT_WEIGHT.semibold }}>
                                        {verifying ? 'Đang gửi...' : 'Xác thực'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Input
                            label="Email"
                            placeholder="example@email.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            leftIcon="mail-outline"
                            error={emailError}
                            autoComplete="email"
                        />

                        <Input
                            label="Mật khẩu"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChangeText={setPassword}
                            isPassword
                            leftIcon="lock-closed-outline"
                            error={passwordError}
                        />

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={{ alignSelf: 'flex-end', marginBottom: SPACING.lg }}
                        >
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>Quên mật khẩu?</Text>
                        </TouchableOpacity>

                        <Button
                            title="Đăng nhập"
                            icon="log-in-outline"
                            onPress={handleLogin}
                            loading={isLoading}
                            fullWidth
                            style={{ marginTop: SPACING.sm }}
                        />

                        {quickBioEnabled && (
                            <View style={{ marginTop: SPACING.md, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={handleQuickBiometricPress}
                                    disabled={quickBioLoading}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        borderWidth: 1,
                                        borderColor: colors.primary,
                                        backgroundColor: colors.primaryLight,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: quickBioLoading ? 0.7 : 1,
                                    }}
                                >
                                    <Ionicons
                                        name={quickLoginIconName}
                                        size={30}
                                        color={colors.primary}
                                    />
                                </TouchableOpacity>
                                <Text style={{ marginTop: SPACING.sm, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                                    {quickBioLoading ? `Đang xác thực ${quickLoginMethodLabel}...` : `Đăng nhập bằng ${quickLoginMethodLabel}`}
                                </Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                            <Text style={{ marginHorizontal: SPACING.sm, fontSize: FONT_SIZE.sm, color: colors.textHint }}>hoặc</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>Chưa có tài khoản?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                <Text style={{ fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}> Đăng ký ngay</Text>
                            </TouchableOpacity>
                        </View>

                        {!unverifiedEmail && (
                            <TouchableOpacity
                                onPress={handleGoVerify}
                                disabled={verifying}
                                style={{ alignItems: 'center', marginTop: SPACING.md }}
                            >
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                                    Chưa xác thực tài khoản?{' '}
                                    <Text style={{ color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>
                                        {verifying ? 'Đang gửi...' : 'Xác thực tài khoản'}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

