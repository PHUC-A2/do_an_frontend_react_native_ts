import React, { useState } from 'react';
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
import { authService } from '@services/auth.service';
import { AuthScreenProps } from '@navigation/types';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { useToast } from '@hooks/useToast';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';
import { isValidEmail, isValidPassword } from '@utils/helpers';

type Props = AuthScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
    const toast = useToast();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [verifying, setVerifying] = useState(false);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!isValidEmail(email)) e.email = 'Email không hợp lệ';
        if (!isValidPassword(password)) e.password = 'Mật khẩu ít nhất 6 ký tự';
        if (password !== confirmPassword) e.confirm = 'Mật khẩu không khớp';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await authService.register({ email: email.trim(), password });
            const { userId, email: registeredEmail } = res.data.data!.message;
            toast.success('Vui lòng kiểm tra email để xác thực OTP');
            navigation.navigate('VerifyEmail', { userId, email: registeredEmail });
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ??
                err?.message ??
                'Đăng ký thất bại';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoVerify = async () => {
        const targetEmail = email.trim();
        if (!targetEmail) {
            toast.error('Nhập email của bạn vào ô bên trên rồi thử lại');
            return;
        }
        setVerifying(true);
        try {
            const res = await authService.resendOtpByEmail(targetEmail);
            const { userId, email: verifyEmail } = res.data.data!.message;
            toast.success('OTP đã gửi, vui lòng kiểm tra hộp thư');
            navigation.navigate('VerifyEmail', { userId, email: verifyEmail });
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? err?.message ?? 'Gửi OTP thất bại');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.section }}
                    keyboardShouldPersistTaps="handled"
                >
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
                        {/* Back button */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}
                        >
                            <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium, marginLeft: 4 }}>Quay lại</Text>
                        </TouchableOpacity>

                        <Text style={{ fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs }}>Tạo tài khoản</Text>
                        <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, marginBottom: SPACING.xxl }}>Đăng ký để bắt đầu đặt sân</Text>

                        <Input
                            label="Email"
                            placeholder="example@email.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            leftIcon="mail-outline"
                            error={errors.email}
                            autoComplete="email"
                        />

                        <Input
                            label="Mật khẩu"
                            placeholder="Ít nhất 6 ký tự"
                            value={password}
                            onChangeText={setPassword}
                            isPassword
                            leftIcon="lock-closed-outline"
                            error={errors.password}
                        />

                        <Input
                            label="Xác nhận mật khẩu"
                            placeholder="Nhập lại mật khẩu"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            isPassword
                            leftIcon="lock-closed-outline"
                            error={errors.confirm}
                        />

                        <Button
                            title="Đăng ký"
                            icon="person-add-outline"
                            onPress={handleRegister}
                            loading={loading}
                            fullWidth
                            style={{ marginTop: SPACING.sm }}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                            <Text style={{ marginHorizontal: SPACING.sm, fontSize: FONT_SIZE.sm, color: colors.textHint }}>hoặc</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>Đã có tài khoản?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={{ fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}> Đăng nhập</Text>
                            </TouchableOpacity>
                        </View>

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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
