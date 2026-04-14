import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@config/ThemeContext';
import { ClientTabParamList, ClientStackParamList } from './types';
import { useAppSelector } from '@redux/hooks';
import ClientTopHeader from '@components/common/ClientTopHeader';

// Screens
import HomeScreen from '@screens/client/HomeScreen';
import PitchListScreen from '@screens/client/PitchListScreen';
import MyBookingsScreen from '@screens/client/MyBookingsScreen';
import NotificationsScreen from '@screens/client/NotificationsScreen';
import ProfileScreen from '@screens/client/ProfileScreen';
import PitchDetailScreen from '@screens/client/PitchDetailScreen';
import BookingTimelineScreen from '@screens/client/BookingTimelineScreen';
import CreateBookingScreen from '@screens/client/CreateBookingScreen';
import BookingDetailScreen from '@screens/client/BookingDetailScreen';
import PaymentQRScreen from '@screens/client/PaymentQRScreen';
import EditProfileScreen from '@screens/client/EditProfileScreen';
import AuthNavigator from './AuthNavigator';

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

function StackHeader({ back, options }: NativeStackHeaderProps) {
    return (
        <ClientTopHeader
            title={options.title ?? ''}
            showBack={!!back}
        />
    );
}

function TabHeader({ options }: BottomTabHeaderProps) {
    return (
        <ClientTopHeader
            title={options.title ?? ''}
            showBack={false}
        />
    );
}

function ClientTabs() {
    const unreadCount = useAppSelector((s) => s.notification.unreadCount);
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                header: (props) => <TabHeader {...props} />,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textHint,
                tabBarStyle: {
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface,
                    height: 60 + insets.bottom,
                    paddingBottom: 8 + insets.bottom,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons: Record<string, [string, string]> = {
                        Home: ['home', 'home-outline'],
                        Pitches: ['football', 'football-outline'],
                        MyBookings: ['calendar', 'calendar-outline'],
                        Notifications: ['notifications', 'notifications-outline'],
                        Profile: ['person', 'person-outline'],
                    };
                    const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
                    return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ' }} />
            <Tab.Screen name="Pitches" component={PitchListScreen} options={{ title: 'Sân bóng' }} />
            <Tab.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'Đặt sân' }} />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Thông báo', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
        </Tab.Navigator>
    );
}

export default function ClientNavigator() {
    return (
        <Stack.Navigator screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
            <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
            <Stack.Screen name="PitchDetail" component={PitchDetailScreen} options={{ title: 'Sân bóng' }} />
            <Stack.Screen name="BookingTimeline" component={BookingTimelineScreen} options={{ title: 'Đặt sân' }} />
            <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: 'Xác nhận đặt sân' }} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Chi tiết đặt sân' }} />
            <Stack.Screen name="PaymentQR" component={PaymentQRScreen} options={{ title: 'Thanh toán QR' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Chỉnh sửa hồ sơ' }} />
            {/* Auth flow presented as modal */}
            <Stack.Screen
                name="AuthModal"
                component={AuthNavigator}
                options={{ presentation: 'modal', headerShown: false }}
            />
        </Stack.Navigator>
    );
}
