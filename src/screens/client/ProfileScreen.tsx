import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { useBiometric } from '@hooks/useBiometric';
import { biometricService } from '@services/BiometricService';
import Avatar from '@components/common/Avatar';
import GuestPrompt from '@components/common/GuestPrompt';
import { ClientStackParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { useToast } from '@/hooks/useToast';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

export default function ProfileScreen() {
    const { user, logout, isAuthenticated, isAdmin } = useAuth();
    const { handleEnableBiometric, handleDisableBiometric, getBiometricEnabled } = useBiometric();
    const navigation = useNavigation<Nav>();
    const toast = useToast();
    const { colors, isDark, toggleTheme } = useTheme();
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricBusy, setBiometricBusy] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        void (async () => {
            const [enabled, canOffer] = await Promise.all([
                getBiometricEnabled(),
                biometricService.canOfferBiometricLogin(),
            ]);
            setBiometricEnabled(enabled);
            setBiometricAvailable(canOffer);
        })();
    }, [isAuthenticated, getBiometricEnabled]);

    if (!isAuthenticated) {
        return <GuestPrompt icon="person-outline" title="Trang cá nhân" subtitle="Đăng nhập để xem và chỉnh sửa thông tin cá nhân của bạn" />;
    }

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đăng xuất', style: 'destructive', onPress: () => {
                    logout();
                    toast.success('Đăng xuất thành công');
                }
            },
        ]);
    };

    const MENU_ITEMS = [
        ...(isAdmin ? [{ icon: 'shield-outline', label: 'Trang quản trị', onPress: () => navigation.getParent()?.navigate('Admin' as never) }] : []),
        { icon: 'person-outline', label: 'Chỉnh sửa hồ sơ', onPress: () => navigation.navigate('EditProfile') },
        { icon: 'calendar-outline', label: 'Lịch sử đặt sân', onPress: () => { } },
        { icon: 'card-outline', label: 'Lịch sử thanh toán', onPress: () => { } },
        { icon: 'shield-checkmark-outline', label: 'Bảo mật', onPress: () => { } },
        { icon: 'help-circle-outline', label: 'Trợ giúp', onPress: () => { } },
    ];

    const toggleBiometric = async (nextValue: boolean) => {
        if (!biometricAvailable) {
            toast.error('Thiết bị chưa sẵn sàng Face ID/Vân tay.');
            return;
        }
        setBiometricBusy(true);
        try {
            if (nextValue) {
                await handleEnableBiometric();
                setBiometricEnabled(true);
                toast.success('Đã bật đăng nhập sinh trắc học');
            } else {
                await handleDisableBiometric();
                setBiometricEnabled(false);
                toast.success('Đã tắt đăng nhập sinh trắc học');
            }
        } catch (err: any) {
            toast.error(err?.message ?? 'Không thể cập nhật sinh trắc học');
        } finally {
            setBiometricBusy(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
            <ScrollView>
                {/* Profile Header */}
                <View style={{ alignItems: 'center', paddingVertical: SPACING.xxl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Avatar uri={user?.avatar} name={user?.name} size={72} />
                    <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING.md }}>{user?.name ?? 'Người dùng'}</Text>
                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: SPACING.xs }}>{user?.email}</Text>
                </View>

                {/* Dark mode toggle */}
                <View style={{ backgroundColor: colors.surface, marginTop: SPACING.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md }}
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                    >
                        <View style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
                        </View>
                        <Text style={{ flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium }}>
                            {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
                    </TouchableOpacity>
                </View>

                {/* Menu */}
                <View style={{ backgroundColor: colors.surface, marginTop: SPACING.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                    {MENU_ITEMS.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.divider }}
                            onPress={item.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                            </View>
                            <Text style={{ flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium }}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
                        </TouchableOpacity>
                    ))}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: SPACING.lg,
                            paddingVertical: SPACING.md,
                            gap: SPACING.md,
                            borderTopWidth: 1,
                            borderTopColor: colors.divider,
                            opacity: biometricBusy ? 0.6 : 1,
                        }}
                    >
                        <View style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium }}>
                                Đăng nhập bằng sinh trắc học
                            </Text>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: 2 }}>
                                Bật/tắt Face ID hoặc vân tay cho đăng nhập nhanh
                            </Text>
                        </View>
                        <Switch
                            value={biometricEnabled}
                            disabled={biometricBusy || !biometricAvailable}
                            onValueChange={(next) => {
                                void toggleBiometric(next);
                            }}
                            thumbColor={biometricEnabled ? '#fff' : colors.textHint}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: SPACING.xxl, gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.danger }}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.danger, fontWeight: FONT_WEIGHT.semibold }}>Đăng xuất</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
