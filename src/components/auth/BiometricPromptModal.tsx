import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';

export type BiometricKind = 'face' | 'fingerprint' | 'unknown';

type Props = {
    visible: boolean;
    /** Loại sinh trắc học để chọn icon / dòng mô tả phù hợp */
    biometricKind: BiometricKind;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
};

function biometricSubtitle(kind: BiometricKind): string {
    if (kind === 'face') return 'Xác thực bằng Face ID';
    if (kind === 'fingerprint') return 'Sử dụng vân tay để đăng nhập';
    return 'Đăng nhập nhanh và an toàn hơn';
}

function biometricIconName(kind: BiometricKind): keyof typeof Ionicons.glyphMap {
    if (kind === 'face') return 'scan-outline';
    return 'finger-print-outline';
}

/**
 * Modal hỏi có bật đăng nhập Face ID / vân tay sau khi đăng nhập email+mật khẩu lần đầu.
 */
export default function BiometricPromptModal({
    visible,
    biometricKind,
    loading,
    onConfirm,
    onCancel,
}: Props) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    justifyContent: 'center',
                    paddingHorizontal: SPACING.xl,
                }}
            >
                <View
                    style={[
                        {
                            backgroundColor: colors.surface,
                            borderRadius: 20,
                            padding: SPACING.xxl,
                        },
                        SHADOW.md,
                    ]}
                >
                    <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
                        <View
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: colors.primaryLight,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: SPACING.md,
                            }}
                        >
                            <Ionicons name={biometricIconName(biometricKind)} size={36} color={colors.primary} />
                        </View>
                        <Text
                            style={{
                                fontSize: FONT_SIZE.xxl,
                                fontWeight: FONT_WEIGHT.bold,
                                color: colors.textPrimary,
                                textAlign: 'center',
                            }}
                        >
                            Bật đăng nhập bằng Face ID / vân tay?
                        </Text>
                        <Text
                            style={{
                                fontSize: FONT_SIZE.md,
                                color: colors.textSecondary,
                                textAlign: 'center',
                                marginTop: SPACING.sm,
                            }}
                        >
                            {biometricSubtitle(biometricKind)}
                        </Text>
                        <Text
                            style={{
                                fontSize: FONT_SIZE.sm,
                                color: colors.textHint,
                                textAlign: 'center',
                                marginTop: SPACING.xs,
                            }}
                        >
                            Đăng nhập nhanh và an toàn hơn. Chúng tôi chỉ lưu mã đăng nhập (JWT), không lưu mật khẩu.
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onConfirm}
                        disabled={loading}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SPACING.sm,
                            backgroundColor: colors.primary,
                            paddingVertical: SPACING.md,
                            borderRadius: 12,
                            marginBottom: SPACING.sm,
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textInverse} />
                        ) : (
                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textInverse} />
                        )}
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textInverse }}>
                            {loading ? 'Đang xử lý...' : 'Bật đăng nhập nhanh'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onCancel}
                        disabled={loading}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SPACING.xs,
                            paddingVertical: SPACING.md,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceVariant,
                        }}
                    >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary }}>
                            Để sau
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
