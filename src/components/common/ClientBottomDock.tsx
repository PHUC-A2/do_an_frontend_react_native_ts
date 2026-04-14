import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@config/ThemeContext';
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

    return (
        <View
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
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
                    <Ionicons name={item.inactiveIcon as any} size={22} color={colors.textHint} />
                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: colors.textHint }}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
