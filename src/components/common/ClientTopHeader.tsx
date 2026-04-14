import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@config/ThemeContext';
import { useAuth } from '@hooks/useAuth';
import { useAppSelector } from '@redux/hooks';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import Avatar from '@components/common/Avatar';

interface ClientTopHeaderProps {
    title: string;
    showBack?: boolean;
}

export default function ClientTopHeader({ title, showBack = false }: ClientTopHeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { colors, isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const unreadCount = useAppSelector((s) => s.notification.unreadCount);
    const avatarFallbackName = (user?.email?.trim()?.[0] ?? 'G').toUpperCase();

    return (
        <View
            style={{
                backgroundColor: colors.background,
                paddingTop: insets.top + SPACING.sm,
                paddingHorizontal: SPACING.xl,
                paddingBottom: SPACING.md,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {showBack ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: SPACING.xs }} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Xin chào</Text>
                        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{user?.name ?? 'Bạn'}</Text>
                    </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <TouchableOpacity
                        style={{ position: 'relative', padding: SPACING.xs }}
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                        {unreadCount > 0 && (
                            <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: SPACING.xs }} onPress={toggleTheme} activeOpacity={0.7}>
                        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: SPACING.xs }} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
                        <Avatar uri={user?.avatar} name={avatarFallbackName} size={28} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
