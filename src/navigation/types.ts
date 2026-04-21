import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';

// ---- Auth Stack ----
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    VerifyEmail: { userId: number; email: string };
    ForgotPassword: undefined;
    ResetPassword: { email: string };
};

// ---- Client Tab ----
export type ClientTabParamList = {
    Home: undefined;
    Pitches: undefined;
    MyBookings: undefined;
    Notifications: undefined;
    Profile: undefined;
};

// ---- Client Stack (wraps tabs + detail screens) ----
export type ClientStackParamList = {
    ClientTabs: undefined;
    PitchDetail: { pitchId: number };
    BookingTimeline: { pitchId: number };
    CreateBooking: { pitchId: number; startTime: string; endTime: string };
    BookingDetail: { bookingId: number };
    PaymentQR: { bookingId: number };
    ReviewCreate: { targetType: 'PITCH' | 'EQUIPMENT'; targetId: number; targetName: string };
    EditProfile: undefined;
    AuthModal: NavigatorScreenParams<AuthStackParamList> | undefined;
};

// ---- Admin Tab ----
export type AdminTabParamList = {
    Dashboard: undefined;
    Bookings: undefined;
    Pitches: undefined;
    Equipment: undefined;
    Users: undefined;
};

// ---- Admin Stack ----
export type AdminStackParamList = {
    AdminTabs: undefined;
    AdminBookingDetail: { bookingId: number };
    AdminPitchDetail: { pitchId: number };
    AdminPitchCreate: undefined;
    AdminUserDetail: { userId: number };
};

// ---- Root ----
export type RootStackParamList = {
    Auth: undefined;
    Client: undefined;
    Admin: undefined;
};

// Screen prop helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
    AuthStackParamList,
    T
>;

export type ClientScreenProps<T extends keyof ClientStackParamList> = NativeStackScreenProps<
    ClientStackParamList,
    T
>;

export type AdminScreenProps<T extends keyof AdminStackParamList> = NativeStackScreenProps<
    AdminStackParamList,
    T
>;
