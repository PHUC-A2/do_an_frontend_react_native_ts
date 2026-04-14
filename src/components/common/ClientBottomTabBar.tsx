import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';

const TAB_ICONS: Record<string, [string, string]> = {
    Home: ['home', 'home-outline'],
    Pitches: ['football', 'football-outline'],
    MyBookings: ['calendar', 'calendar-outline'],
    Notifications: ['notifications', 'notifications-outline'],
    Profile: ['person', 'person-outline'],
};

const ClientBottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

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
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const { options } = descriptors[route.key];
                const label = typeof options.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : (typeof options.title === 'string' ? options.title : route.name);
                const [activeIcon, inactiveIcon] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
                const color = isFocused ? colors.primary : colors.textHint;
                const badge = options.tabBarBadge;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        activeOpacity={0.8}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <View style={{ position: 'relative' }}>
                            <Ionicons name={(isFocused ? activeIcon : inactiveIcon) as any} size={22} color={color} />
                            {typeof badge === 'number' && badge > 0 ? (
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
                                        {badge > 9 ? '9+' : badge}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color }}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default ClientBottomTabBar;
