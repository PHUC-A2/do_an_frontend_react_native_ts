import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '@components/common/Avatar';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@config/theme';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { authService } from '@services/auth.service';
import { fetchAccount, setAccount } from '@redux/slices/accountSlice';
import { useToast } from '@/hooks/useToast';
import { ClientStackParamList } from '@navigation/types';
import { NotificationSoundPreset } from '@/types/user.types';
import { IMAGE_BASE_URL } from '@utils/constants';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const SOUND_OPTIONS: { value: NotificationSoundPreset; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'DEFAULT', label: 'Mặc định', description: 'Âm báo cân bằng, dễ nhận biết.', icon: 'volume-medium-outline' },
    { value: 'SOFT', label: 'Nhẹ nhàng', description: 'Nhỏ và êm hơn cho thao tác hằng ngày.', icon: 'musical-notes-outline' },
    { value: 'ALERT', label: 'Cảnh báo', description: 'Rõ và nổi bật hơn khi cần chú ý.', icon: 'notifications-outline' },
];

const resolveImageUri = (value?: string | null) => {
    const raw = value?.trim();
    if (!raw) return null;
    if (raw.startsWith('http')) return raw;
    const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${path}`;
};

export default function EditProfileScreen() {
    const navigation = useNavigation<Nav>();
    const dispatch = useAppDispatch();
    const account = useAppSelector((state) => state.account.account);
    const toast = useToast();
    const { colors, isDark } = useTheme();
    const shadowStyle = isDark ? {} : SHADOW.sm;
    const [name, setName] = useState('');
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarRemoved, setAvatarRemoved] = useState(false);
    const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
    const [notificationSoundPreset, setNotificationSoundPreset] = useState<NotificationSoundPreset>('DEFAULT');
    const [loading, setLoading] = useState(false);
    const [testingSound, setTestingSound] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; fullName?: string; phoneNumber?: string }>({});

    useEffect(() => {
        void dispatch(fetchAccount());
    }, [dispatch]);

    useEffect(() => {
        if (!account) return;
        setName(account.name ?? '');
        setFullName(account.fullName ?? '');
        setPhoneNumber(account.phoneNumber ?? account.phone ?? '');
        setAvatarUrl(account.avatarUrl ?? account.avatar ?? '');
        setAvatarRemoved(false);
        setNotificationSoundEnabled(account.notificationSoundEnabled !== false);
        setNotificationSoundPreset(account.notificationSoundPreset ?? 'DEFAULT');
    }, [account]);

    const previewUri = useMemo(() => resolveImageUri(avatarUrl), [avatarUrl]);

    const validate = () => {
        const nextErrors: { name?: string; fullName?: string; phoneNumber?: string } = {};
        const trimmedName = name.trim();
        const trimmedFullName = fullName.trim();
        const trimmedPhone = phoneNumber.trim();

        if (trimmedName.length > 50) nextErrors.name = 'Tên đăng nhập tối đa 50 ký tự';

        if (trimmedFullName.length > 100) nextErrors.fullName = 'Họ và tên tối đa 100 ký tự';
        if (trimmedPhone && !/^\d{9,11}$/.test(trimmedPhone)) nextErrors.phoneNumber = 'Số điện thoại phải từ 9-11 chữ số';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const requestMediaPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh trong Cài đặt.');
            return false;
        }
        return true;
    };

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền camera', 'Vui lòng cho phép truy cập camera trong Cài đặt.');
            return false;
        }
        return true;
    };

    const uploadAvatarFromUri = async (uri: string) => {
        const filename = uri.split('/').pop() ?? 'avatar.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const formData = new FormData();
        formData.append('file', { uri, name: filename, type: mimeType } as any);
        formData.append('folder', 'avatar');
        const res = await authService.uploadAvatarImage(formData);
        const url = res.data?.data?.url;
        if (!url) throw new Error('Không nhận được URL ảnh đại diện');
        setAvatarUrl(url);
        setAvatarRemoved(false);
    };

    const handlePickAvatar = () => {
        Alert.alert('Ảnh đại diện', 'Chọn nguồn ảnh', [
            {
                text: 'Chụp ảnh',
                onPress: async () => {
                    if (!(await requestCameraPermission())) return;
                    const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 1,
                        allowsEditing: false,
                    });
                    if (result.canceled || !result.assets[0]) return;
                    try {
                        setLoading(true);
                        await uploadAvatarFromUri(result.assets[0].uri);
                        toast.success('Tải ảnh đại diện thành công');
                    } catch (error: any) {
                        toast.error(error?.response?.data?.message ?? error?.message ?? 'Không thể tải ảnh đại diện');
                    } finally {
                        setLoading(false);
                    }
                },
            },
            {
                text: 'Thư viện ảnh',
                onPress: async () => {
                    if (!(await requestMediaPermission())) return;
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 1,
                        allowsEditing: false,
                    });
                    if (result.canceled || !result.assets[0]) return;
                    try {
                        setLoading(true);
                        await uploadAvatarFromUri(result.assets[0].uri);
                        toast.success('Tải ảnh đại diện thành công');
                    } catch (error: any) {
                        toast.error(error?.response?.data?.message ?? error?.message ?? 'Không thể tải ảnh đại diện');
                    } finally {
                        setLoading(false);
                    }
                },
            },
            { text: 'Hủy', style: 'cancel' },
        ]);
    };

    const handleRemoveAvatar = async () => {
        if (!avatarUrl) return;

        setLoading(true);
        try {
            await authService.updateAccount({ avatarUrl: '' });
            setAvatarUrl('');
            setAvatarRemoved(false);
            setPreviewOpen(false);

            if (account) {
                dispatch(setAccount({
                    ...account,
                    avatar: null,
                    avatarUrl: null,
                }));
            }

            await dispatch(fetchAccount());
            toast.success('Đã xóa ảnh đại diện');
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Không thể xóa ảnh đại diện');
        } finally {
            setLoading(false);
        }
    };

    const handleTestSound = async () => {
        if (!notificationSoundEnabled) {
            toast.info('Hãy bật âm báo trước khi nghe thử');
            return;
        }

        const presetLabels: Record<NotificationSoundPreset, string> = {
            DEFAULT: 'Mặc định',
            SOFT: 'Nhẹ nhàng',
            ALERT: 'Cảnh báo',
        };

        setTestingSound(true);
        try {
            const existing = await Notifications.getPermissionsAsync();
            const granted = existing.granted
                ? true
                : (await Notifications.requestPermissionsAsync({
                    ios: { allowAlert: true, allowBadge: false, allowSound: true },
                })).granted;

            if (!granted) {
                toast.error('Thiết bị chưa cho phép phát thông báo');
                return;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Âm báo thử',
                    body: `Đang dùng kiểu ${presetLabels[notificationSoundPreset]}.`,
                    sound: 'default',
                    data: {
                        __source: 'local-ws',
                        targetTab: 'Profile',
                        screen: 'profile',
                    },
                },
                trigger: null,
            });
        } catch (error: any) {
            toast.error(error?.message ?? 'Không thể phát âm báo thử');
        } finally {
            setTestingSound(false);
        }
    };

    const handleOpenForgotPassword = () => {
        navigation.navigate('AuthModal', { screen: 'ForgotPassword' });
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const trimmedName = name.trim();
            const trimmedFullName = fullName.trim();
            const trimmedPhoneNumber = phoneNumber.trim();

            await authService.updateAccount({
                name: trimmedName ? trimmedName : undefined,
                fullName: trimmedFullName ? trimmedFullName : null,
                phoneNumber: trimmedPhoneNumber ? trimmedPhoneNumber : null,
                avatarUrl: avatarRemoved ? '' : avatarUrl,
                notificationSoundEnabled,
                notificationSoundPreset,
            });
            await dispatch(fetchAccount());
            toast.success('Cập nhật thông tin thành công');
            navigation.goBack();
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Không thể cập nhật thông tin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
            <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setPreviewOpen(false)}>
                    <View style={styles.previewBackdrop}>
                        {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" /> : null}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle]}>
                        <View style={styles.avatarBlock}>
                            <TouchableOpacity activeOpacity={0.85} onPress={() => previewUri ? setPreviewOpen(true) : undefined}>
                                <View style={[styles.avatarFrame, { borderColor: colors.border }]}>
                                    <Avatar uri={avatarUrl} name={fullName || name || account?.email || ''} size={92} />
                                </View>
                            </TouchableOpacity>
                            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Ảnh đại diện</Text>
                            <Text style={[styles.helperText, { color: colors.textSecondary }]}>Nhấn vào ảnh để xem trước hoặc thay đổi</Text>
                            <View style={styles.avatarActions}>
                                <Button title="Chọn ảnh" icon="camera-outline" size="sm" onPress={handlePickAvatar} loading={loading} />
                                <Button title="Xóa ảnh" icon="trash-outline" size="sm" variant="outline" onPress={handleRemoveAvatar} disabled={!avatarUrl} />
                            </View>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>THÔNG TIN CƠ BẢN</Text>
                        <Input
                            label="Tên đăng nhập"
                            value={name}
                            onChangeText={(value) => {
                                setName(value);
                                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            leftIcon="card-outline"
                            placeholder="Nhập tên đăng nhập"
                            error={errors.name}
                        />
                        <Input
                            label="Họ và tên"
                            value={fullName}
                            onChangeText={(value) => {
                                setFullName(value);
                                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                            }}
                            leftIcon="person-outline"
                            placeholder="Nhập họ và tên đầy đủ"
                            error={errors.fullName}
                            autoCapitalize="words"
                        />
                        <Input
                            label="Email liên hệ"
                            value={account?.email ?? ''}
                            leftIcon="mail-outline"
                            editable={false}
                            containerStyle={styles.readonlyField}
                        />
                        <Input
                            label="Số điện thoại"
                            value={phoneNumber}
                            onChangeText={(value) => {
                                setPhoneNumber(value);
                                if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                            }}
                            leftIcon="call-outline"
                            placeholder="Ví dụ: 0912345678"
                            keyboardType="phone-pad"
                            error={errors.phoneNumber}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>THÔNG BÁO</Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.toggleRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                            onPress={() => setNotificationSoundEnabled((prev) => !prev)}
                        >
                            <View style={[styles.leadingIcon, { backgroundColor: colors.primaryLight }]}>
                                <Ionicons name="volume-high-outline" size={18} color={colors.primary} />
                            </View>
                            <View style={styles.toggleTextWrap}>
                                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Chuông thông báo trên giao diện</Text>
                                <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Bật hoặc tắt âm báo giống cấu hình web</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: notificationSoundEnabled ? colors.primaryLight : colors.divider }]}>
                                <Text style={{ color: notificationSoundEnabled ? colors.primary : colors.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold }}>
                                    {notificationSoundEnabled ? 'Bật' : 'Tắt'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.subsectionTitle, { color: colors.textPrimary }]}>Kiểu âm thanh thông báo</Text>
                        {SOUND_OPTIONS.map((option) => {
                            const active = notificationSoundPreset === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.soundOption,
                                        {
                                            backgroundColor: active ? colors.primaryLight : colors.surfaceVariant,
                                            borderColor: active ? colors.primary : colors.border,
                                            opacity: notificationSoundEnabled ? 1 : 0.5,
                                        },
                                    ]}
                                    disabled={!notificationSoundEnabled}
                                    onPress={() => setNotificationSoundPreset(option.value)}
                                >
                                    <View style={[styles.leadingIcon, { backgroundColor: active ? colors.primary : colors.surface }]}>
                                        <Ionicons name={option.icon} size={18} color={active ? colors.textInverse : colors.primary} />
                                    </View>
                                    <View style={styles.optionTextWrap}>
                                        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{option.label}</Text>
                                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                                    </View>
                                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.textHint} />
                                </TouchableOpacity>
                            );
                        })}
                        <Button
                            title="Nghe thử âm báo"
                            icon="volume-high-outline"
                            variant="outline"
                            fullWidth
                            loading={testingSound}
                            onPress={handleTestSound}
                            disabled={!notificationSoundEnabled}
                            style={styles.inlineAction}
                        />
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>BẢO MẬT</Text>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.securityAction, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                            onPress={handleOpenForgotPassword}
                        >
                            <View style={[styles.leadingIcon, { backgroundColor: colors.primaryLight }]}>
                                <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
                            </View>
                            <View style={styles.optionTextWrap}>
                                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Đổi mật khẩu qua email</Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                    Mở cửa sổ nhập email để nhận mã đặt lại mật khẩu.
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerActions}>
                        <Button title="Hủy" variant="outline" fullWidth onPress={() => navigation.goBack()} />
                        <Button title="Lưu thay đổi" icon="save-outline" fullWidth loading={loading} onPress={handleSubmit} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxxl },
    card: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
    },
    avatarBlock: {
        alignItems: 'center',
    },
    avatarFrame: {
        width: 108,
        height: 108,
        padding: 6,
        borderRadius: 54,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: FONT_WEIGHT.bold,
        marginTop: SPACING.md,
    },
    helperText: {
        fontSize: FONT_SIZE.sm,
        marginTop: SPACING.xs,
    },
    avatarActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.semibold,
        marginBottom: SPACING.md,
        letterSpacing: 0.5,
    },
    readonlyField: {
        opacity: 0.85,
    },
    toggleRow: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    leadingIcon: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleTextWrap: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.semibold,
    },
    toggleSubtitle: {
        fontSize: FONT_SIZE.sm,
        marginTop: 2,
    },
    statusPill: {
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
    },
    subsectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.semibold,
        marginBottom: SPACING.sm,
    },
    soundOption: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginTop: SPACING.sm,
    },
    optionTextWrap: {
        flex: 1,
    },
    optionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.semibold,
    },
    optionDescription: {
        fontSize: FONT_SIZE.sm,
        marginTop: 2,
    },
    footerActions: {
        gap: SPACING.md,
    },
    inlineAction: {
        marginTop: SPACING.lg,
    },
    securityAction: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    previewBackdrop: {
        flex: 1,
        backgroundColor: '#000000DD',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    previewImage: {
        width: '100%',
        height: '70%',
    },
});
