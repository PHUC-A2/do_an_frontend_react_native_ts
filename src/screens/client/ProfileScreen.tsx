import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Platform, DeviceEventEmitter, Modal, Image, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { BIOMETRIC_STATUS_CHANGED_EVENT, useBiometric } from '@hooks/useBiometric';
import { biometricService } from '@services/BiometricService';
import { fetchAccount } from '@redux/slices/accountSlice';
import Avatar from '@components/common/Avatar';
import Button from '@components/common/Button';
import GuestPrompt from '@components/common/GuestPrompt';
import { ClientStackParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { useToast } from '@/hooks/useToast';
import * as Clipboard from 'expo-clipboard';
import { IMAGE_BASE_URL } from '@utils/constants';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

export default function ProfileScreen() {
    const { user, logout, isAuthenticated, isAdmin } = useAuth();
    const { handleEnableBiometric, handleDisableBiometric, getBiometricEnabled } = useBiometric();
    const navigation = useNavigation<Nav>();
    const toast = useToast();
    const { colors, isDark, toggleTheme } = useTheme();
    const dispatch = useAppDispatch();
    const account = useAppSelector((state) => state.account.account);
    const biometricLabel = Platform.OS === 'ios' ? 'Face ID' : 'vân tay';
    const biometricIconName = Platform.OS === 'ios' ? 'scan-outline' : 'finger-print-outline';
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricBusy, setBiometricBusy] = useState(false);
    const [previewAvatarOpen, setPreviewAvatarOpen] = useState(false);

    const loadBiometricState = useCallback(async () => {
        if (!isAuthenticated) return;
        const [enabled, canOffer] = await Promise.all([
            getBiometricEnabled(),
            biometricService.canOfferBiometricLogin(),
        ]);
        setBiometricEnabled(enabled);
        setBiometricAvailable(canOffer);
    }, [isAuthenticated, getBiometricEnabled]);

    useFocusEffect(
        useCallback(() => {
            void dispatch(fetchAccount());
            void loadBiometricState();
            return undefined;
        }, [dispatch, loadBiometricState]),
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(
            BIOMETRIC_STATUS_CHANGED_EVENT,
            (payload?: { enabled?: boolean }) => {
                if (typeof payload?.enabled === 'boolean') {
                    setBiometricEnabled(payload.enabled);
                } else {
                    void loadBiometricState();
                }
            },
        );
        return () => subscription.remove();
    }, [loadBiometricState]);

    const shadowStyle = isDark ? {} : SHADOW.sm;
    const displayName = account?.fullName?.trim() || account?.name || user?.name || 'Người dùng';
    const displayPhone = account?.phoneNumber ?? account?.phone ?? null;
    const displayAvatar = account?.avatarUrl ?? account?.avatar ?? user?.avatar ?? null;
    const previewAvatarUri = useMemo(() => {
        const raw = displayAvatar?.trim();
        if (!raw) return null;
        if (raw.startsWith('http')) return raw;
        const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
        const path = raw.startsWith('/') ? raw : `/${raw}`;
        return `${base}${path}`;
    }, [displayAvatar]);

    const infoRows = useMemo(() => [
        {
            icon: 'card-outline' as const,
            label: 'Tên đăng nhập / ID',
            value: account ? `${account.name} (ID: ${account.id})` : 'N/A',
            copyable: false,
        },
        {
            icon: 'person-outline' as const,
            label: 'Họ và tên',
            value: account?.fullName?.trim() || 'Chưa cập nhật',
            copyable: false,
        },
        {
            icon: 'mail-outline' as const,
            label: 'Email liên hệ',
            value: account?.email || user?.email || 'Chưa cập nhật',
            copyable: false,
        },
        {
            icon: 'call-outline' as const,
            label: 'Số điện thoại',
            value: displayPhone?.trim() || 'Chưa cập nhật',
            copyable: !!displayPhone?.trim(),
        },
    ], [account, displayPhone, user?.email]);

    const handleCopy = async (value: string, label: string) => {
        await Clipboard.setStringAsync(value);
        toast.success(`${label} đã được sao chép`);
    };

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

    const toggleBiometric = async (nextValue: boolean) => {
        if (!biometricAvailable) {
            toast.error(`Thiết bị chưa sẵn sàng ${biometricLabel}.`);
            return;
        }
        setBiometricBusy(true);
        try {
            if (nextValue) {
                await handleEnableBiometric();
                setBiometricEnabled(true);
                toast.success(`Đã bật đăng nhập bằng ${biometricLabel}`);
            } else {
                await handleDisableBiometric();
                setBiometricEnabled(false);
                toast.success(`Đã tắt đăng nhập bằng ${biometricLabel}`);
            }
        } catch (err: any) {
            toast.error(err?.message ?? `Không thể cập nhật ${biometricLabel}`);
        } finally {
            setBiometricBusy(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
            <Modal visible={previewAvatarOpen} transparent animationType="fade" onRequestClose={() => setPreviewAvatarOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setPreviewAvatarOpen(false)}>
                    <View style={{ flex: 1, backgroundColor: '#000000DD', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
                        {previewAvatarUri ? (
                            <Image source={{ uri: previewAvatarUri }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
                        ) : null}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            <ScrollView>
                <View style={{ margin: SPACING.lg, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: colors.border, padding: SPACING.xl, alignItems: 'center', ...shadowStyle }}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => previewAvatarUri ? setPreviewAvatarOpen(true) : undefined}
                        style={{ alignItems: 'center' }}
                    >
                        <View style={{ width: 104, height: 104, padding: 4, borderRadius: 52, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                            <Avatar uri={displayAvatar} name={displayName} size={90} />
                        </View>
                        <View style={{ marginTop: -8, backgroundColor: '#FBBF24', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                            <Text style={{ fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: FONT_WEIGHT.bold }}>MEMBER</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING.md }}>{displayName}</Text>
                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: SPACING.xs }}>{account?.email ?? user?.email}</Text>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: SPACING.sm }}>Ảnh đại diện của bạn</Text>
                    <View style={{ marginTop: SPACING.lg, width: '100%' }}>
                        <Button title="Chỉnh sửa hồ sơ" icon="create-outline" fullWidth onPress={() => navigation.navigate('EditProfile')} />
                    </View>
                </View>

                <View style={{ margin: SPACING.lg, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: colors.border, padding: SPACING.lg, ...shadowStyle }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Thông tin tài khoản
                    </Text>
                    {infoRows.map((row, index) => (
                        <View key={row.label}>
                            <View style={{ flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', paddingVertical: SPACING.sm }}>
                                <View style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name={row.icon} size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: 4 }}>{row.label}</Text>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium }}>{row.value}</Text>
                                </View>
                                {row.copyable ? (
                                    <TouchableOpacity activeOpacity={0.7} onPress={() => void handleCopy(row.value, row.label)} style={{ paddingTop: 4 }}>
                                        <Ionicons name="copy-outline" size={18} color={colors.textHint} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            {index < infoRows.length - 1 ? <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: SPACING.sm }} /> : null}
                        </View>
                    ))}
                </View>

                <View style={{ marginHorizontal: SPACING.lg, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadowStyle }}>
                    {[
                        ...(isAdmin ? [{ icon: 'shield-outline', label: 'Trang quản trị', onPress: () => navigation.getParent()?.navigate('Admin' as never) }] : []),
                        { icon: isDark ? 'sunny-outline' : 'moon-outline', label: isDark ? 'Chế độ sáng' : 'Chế độ tối', onPress: toggleTheme },
                    ].map((item, idx) => (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md, borderTopWidth: 1, borderTopColor: colors.divider, opacity: biometricBusy ? 0.6 : 1 }}>
                        <View style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={biometricIconName} size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium }}>
                                Đăng nhập bằng {biometricLabel}
                            </Text>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: 2 }}>
                                Bật/tắt {biometricLabel} cho đăng nhập nhanh
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
