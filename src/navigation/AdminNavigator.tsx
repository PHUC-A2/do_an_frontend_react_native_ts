import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@config/theme';
import { AdminTabParamList, AdminStackParamList } from './types';
import ScreenHeader from '@components/common/ScreenHeader';

// Screens
import AdminDashboardScreen from '@screens/admin/DashboardScreen';
import AdminBookingsScreen from '@screens/admin/BookingManagementScreen';
import AdminPitchesScreen from '@screens/admin/PitchManagementScreen';
import AdminEquipmentScreen from '@screens/admin/EquipmentManagementScreen';
import AdminUsersScreen from '@screens/admin/UserManagementScreen';
import AdminBookingDetailScreen from '@screens/admin/BookingDetailScreen';
import AdminPitchDetailScreen from '@screens/admin/PitchDetailScreen';
import AdminUserDetailScreen from '@screens/admin/UserDetailScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminStackHeader({ back, options }: NativeStackHeaderProps) {
    return (
        <ScreenHeader
            title={options.title ?? ''}
            showBack={!!back}
            rightAction={
                typeof options.headerRight === 'function'
                    ? (options.headerRight({ canGoBack: !!back }) as React.ReactNode)
                    : undefined
            }
        />
    );
}

function AdminTabHeader({ options }: BottomTabHeaderProps) {
    return (
        <ScreenHeader
            title={options.title ?? ''}
            showBack={false}
            rightAction={
                typeof options.headerRight === 'function'
                    ? (options.headerRight({ canGoBack: false }) as React.ReactNode)
                    : undefined
            }
        />
    );
}

function AdminTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                header: (props) => <AdminTabHeader {...props} />,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textHint,
                tabBarStyle: {
                    borderTopColor: COLORS.border,
                    backgroundColor: COLORS.surface,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons: Record<string, [string, string]> = {
                        Dashboard: ['stats-chart', 'stats-chart-outline'],
                        Bookings: ['calendar', 'calendar-outline'],
                        Pitches: ['football', 'football-outline'],
                        Equipment: ['barbell', 'barbell-outline'],
                        Users: ['people', 'people-outline'],
                    };
                    const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
                    return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Tổng quan' }} />
            <Tab.Screen name="Bookings" component={AdminBookingsScreen} options={{ title: 'Đặt sân' }} />
            <Tab.Screen name="Pitches" component={AdminPitchesScreen} options={{ title: 'Sân bóng' }} />
            <Tab.Screen name="Equipment" component={AdminEquipmentScreen} options={{ title: 'Thiết bị' }} />
            <Tab.Screen name="Users" component={AdminUsersScreen} options={{ title: 'Người dùng' }} />
        </Tab.Navigator>
    );
}

export default function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ header: (props) => <AdminStackHeader {...props} /> }}>
            <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AdminBookingDetail" component={AdminBookingDetailScreen} options={{ title: 'Chi tiết đặt sân' }} />
            <Stack.Screen name="AdminPitchDetail" component={AdminPitchDetailScreen} options={{ title: 'Chi tiết sân bóng' }} />
            <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'Chi tiết người dùng' }} />
        </Stack.Navigator>
    );
}
