import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@services/auth.service';
import { AuthScreenProps } from '@navigation/types';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { useToast } from '@hooks/useToast';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW, BORDER_RADIUS } from '@config/theme';
import { isValidPassword } from '@utils/helpers';

type Props = AuthScreenProps<'ResetPassword'>;

const OTP_LENGTH = 6;

export default function ResetPasswordScreen({ route, navigation }: Props) {
    const { email } = route.params;
    const toast = useToast();
    const { colors } = useTheme();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCountdown = (seconds = 60) => {
        setCountdown(seconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        startCountdown();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const handleResend = async () => {
        setResending(true);
        try {
            await authService.forgotPassword({ email });
            toast.success('Đã gửi lại OTP. Vui lòng kiểm tra hộp thư.');
            startCountdown();
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Gửi lại thất bại';
            toast.error(msg);
        } finally {
            setResending(false);
        }
    };

    const handleChange = (val: string, idx: number) => {
        const digit = val.replace(/[^0-9]/g, '').slice(-1);
        const next = [...otp];
        next[idx] = digit;
        setOtp(next);
        if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
        if (!digit && idx > 0) inputRefs.current[idx - 1]?.focus();
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        const code = otp.join('');
        if (code.length < OTP_LENGTH) e.otp = 'Vui lòng nhập đủ 6 chữ số OTP';
        if (!isValidPassword(newPassword)) e.newPassword = 'Mật khẩu ít nhất 6 ký tự';
        if (newPassword !== confirmPassword) e.confirmPassword = 'Mật khẩu không khớp';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await authService.resetPassword({ email, otp: otp.join(''), newPassword });
            toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập.');
            navigation.navigate('Login');
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Đặt lại mật khẩu thất bại';
            toast.error(msg);
        } finally {
            setLoading(false);
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

                    {/* Card */}
                    <View style={[{ backgroundColor: colors.surface, borderRadius: 20, padding: SPACING.xxl }, SHADOW.md]}>
                        {/* Back button */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}
                        >
                            <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium, marginLeft: 4 }}>Quay lại</Text>
                        </TouchableOpacity>

                        <Text style={{ fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.xs }}>
                            Đặt lại mật khẩu
                        </Text>
                        <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, lineHeight: 22, marginBottom: SPACING.xxl }}>
                            Nhập mã OTP đã gửi tới{' '}
                            <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: colors.primary }}>{email}</Text>
                            {' '}và mật khẩu mới.
                        </Text>

                        {/* OTP Boxes */}
                        <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary, marginBottom: SPACING.sm }}>
                            Mã OTP
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: errors.otp ? SPACING.xs : SPACING.xxl }}>
                            {otp.map((digit, i) => (
                                <TextInput
                                    key={i}
                                    ref={(r) => { inputRefs.current[i] = r; }}
                                    style={{
                                        width: 44,
                                        height: 52,
                                        borderWidth: 2,
                                        borderColor: digit ? colors.primary : colors.border,
                                        borderRadius: BORDER_RADIUS.md,
                                        textAlign: 'center',
                                        fontSize: FONT_SIZE.xxl,
                                        fontWeight: FONT_WEIGHT.bold,
                                        color: colors.textPrimary,
                                        backgroundColor: digit ? colors.primaryLight : colors.surface,
                                    }}
                                    value={digit}
                                    onChangeText={(v) => handleChange(v, i)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>
                        {errors.otp && (
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.error, marginBottom: SPACING.lg }}>
                                {errors.otp}
                            </Text>
                        )}

                        <Input
                            label="Mật khẩu mới"
                            placeholder="Ít nhất 6 ký tự"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            isPassword
                            leftIcon="lock-closed-outline"
                            error={errors.newPassword}
                        />

                        <Input
                            label="Xác nhận mật khẩu"
                            placeholder="Nhập lại mật khẩu mới"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            isPassword
                            leftIcon="lock-closed-outline"
                            error={errors.confirmPassword}
                        />

                        <Button
                            title="Đặt lại mật khẩu"
                            icon="checkmark-circle-outline"
                            onPress={handleSubmit}
                            loading={loading}
                            fullWidth
                            style={{ marginTop: SPACING.sm }}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl }}>
                            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>Không nhận được mã?</Text>
                            {countdown > 0 ? (
                                <Text style={{ fontSize: FONT_SIZE.md, color: colors.textHint, fontWeight: FONT_WEIGHT.semibold }}> Gửi lại ({countdown}s)</Text>
                            ) : (
                                <TouchableOpacity onPress={handleResend} disabled={resending}>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>
                                        {resending ? ' Đang gửi...' : ' Gửi lại'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
