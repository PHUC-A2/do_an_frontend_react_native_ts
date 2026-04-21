import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { ClientTabParamList, ClientStackParamList } from './types';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchNotifications } from '@redux/slices/notificationSlice';
import ClientTopHeader from '@components/common/ClientTopHeader';
import ClientBottomTabBar from '@components/common/ClientBottomTabBar';
import ClientBottomDock from '@components/common/ClientBottomDock';
import ClientFloatingChat from '@components/common/ClientFloatingChat';

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
    const dispatch = useAppDispatch();
    const unreadCount = useAppSelector((s) => s.notification.unreadCount);
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchNotifications());
    }, [isAuthenticated, dispatch]);
    return (
        <Tab.Navigator
            backBehavior="history"
            tabBar={(props) => <ClientBottomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: true,
                header: (props) => <TabHeader {...props} />,
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
        <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
                <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
                <Stack.Screen name="PitchDetail" options={{ title: 'Sân bóng' }}>
                    {(props) => (
                        <View style={{ flex: 1 }}>
                            <PitchDetailScreen {...props} />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                <Stack.Screen name="BookingTimeline" options={{ title: 'Đặt sân' }}>
                    {(props) => (
                        <View style={{ flex: 1 }}>
                            <BookingTimelineScreen {...props} />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                <Stack.Screen name="CreateBooking" options={{ title: 'Xác nhận đặt sân' }}>
                    {(props) => (
                        <View style={{ flex: 1 }}>
                            <CreateBookingScreen {...props} />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                <Stack.Screen name="BookingDetail" options={{ title: 'Chi tiết đặt sân' }}>
                    {(props) => (
                        <View style={{ flex: 1 }}>
                            <BookingDetailScreen {...props} />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                <Stack.Screen name="PaymentQR" options={{ title: 'Thanh toán QR' }}>
                    {(props) => (
                        <View style={{ flex: 1 }}>
                            <PaymentQRScreen {...props} />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                <Stack.Screen name="EditProfile" options={{ title: 'Chỉnh sửa hồ sơ' }}>
                    {() => (
                        <View style={{ flex: 1 }}>
                            <EditProfileScreen />
                            <ClientBottomDock />
                        </View>
                    )}
                </Stack.Screen>
                {/* Auth flow presented as modal */}
                <Stack.Screen
                    name="AuthModal"
                    component={AuthNavigator}
                    options={{ presentation: 'modal', headerShown: false }}
                />
            </Stack.Navigator>
            <ClientFloatingChat />
        </View>
    );
}
