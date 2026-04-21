import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@config/ThemeContext';
import { useAppSelector } from '@redux/hooks';
import { FONT_SIZE, FONT_WEIGHT } from '@config/theme';

const DOCK_ITEMS = [
    { key: 'Home', label: 'Trang chủ', activeIcon: 'home', inactiveIcon: 'home-outline' },
    { key: 'Pitches', label: 'Sân bóng', activeIcon: 'football', inactiveIcon: 'football-outline' },
    { key: 'MyBookings', label: 'Đặt sân', activeIcon: 'calendar', inactiveIcon: 'calendar-outline' },
    { key: 'Notifications', label: 'Thông báo', activeIcon: 'notifications', inactiveIcon: 'notifications-outline' },
    { key: 'Profile', label: 'Cá nhân', activeIcon: 'person', inactiveIcon: 'person-outline' },
];

export default function ClientBottomDock() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const unreadCount = useAppSelector((state) => state.notification.unreadCount);

    return (
        <View
            style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: 8 + insets.bottom,
                height: 60 + insets.bottom,
            }}
        >
            {DOCK_ITEMS.map((item) => (
                <TouchableOpacity
                    key={item.key}
                    onPress={() => navigation.navigate('ClientTabs', { screen: item.key })}
                    activeOpacity={0.8}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                >
                    <View style={{ position: 'relative' }}>
                        <Ionicons name={item.inactiveIcon as any} size={22} color={colors.textHint} />
                        {item.key === 'Notifications' && unreadCount > 0 ? (
                            <View
                                style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -10,
                                    minWidth: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    paddingHorizontal: 3,
                                    backgroundColor: colors.danger,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: colors.textHint }}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
