import React, { useState } from 'react';
import {
    View,
    Text,
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
import { FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';
import { isValidEmail } from '@utils/helpers';

type Props = AuthScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
    const toast = useToast();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!isValidEmail(email)) {
            setEmailError('Email không hợp lệ');
            return;
        }
        setEmailError('');
        setLoading(true);
        try {
            await authService.forgotPassword({ email: email.trim() });
            toast.success('OTP đã được gửi, vui lòng kiểm tra hộp thư');
            navigation.navigate('ResetPassword', { email: email.trim() });
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Gửi OTP thất bại';
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
                            Quên mật khẩu
                        </Text>
                        <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, marginBottom: SPACING.xxl, lineHeight: 22 }}>
                            Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
                        </Text>

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

                        <Button
                            title="Gửi mã OTP"
                            icon="send-outline"
                            onPress={handleSubmit}
                            loading={loading}
                            fullWidth
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
