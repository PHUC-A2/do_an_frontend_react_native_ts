import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Image,
    DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { RootState } from '@redux/store';
import { fetchPitches } from '@redux/slices/pitchSlice';
import { fetchUnreadCount } from '@redux/slices/notificationSlice';
import { useAuth } from '@hooks/useAuth';
import { ClientStackParamList, ClientTabParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { ResPitchDTO } from '@/types/pitch.types';
import { PITCH_TYPE_LABEL, IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';
import Avatar from '@components/common/Avatar';
import { CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, CLIENT_SCROLL_TO_TOP_EVENT } from '@components/common/chat/chat.constants';

type Nav = CompositeNavigationProp<
    BottomTabNavigationProp<ClientTabParamList, 'Home'>,
    NativeStackNavigationProp<ClientStackParamList>
>;

export default function HomeScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors, isDark, toggleTheme } = useTheme();
    const { user, isAuthenticated } = useAuth();
    const { pitches, isLoading } = useAppSelector((s: RootState) => s.pitch);
    const { unreadCount } = useAppSelector((s: RootState) => s.notification);
    const avatarFallbackName = (user?.email?.trim()?.[0] ?? 'G').toUpperCase();
    const scrollRef = useRef<ScrollView>(null);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);

    const updateBackToTopVisibility = (scrollY: number) => {
        const canScroll = contentHeightRef.current > layoutHeightRef.current + 12;
        const visible = canScroll && scrollY > 120;
        DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, visible);
    };

    useEffect(() => {
        dispatch(fetchPitches({ page: 1, size: 5 }));
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchUnreadCount());
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(CLIENT_SCROLL_TO_TOP_EVENT, () => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
        return () => {
            subscription.remove();
            DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, false);
        };
    }, []);

    const QUICK_ACTIONS = useMemo(() => [
        { label: 'Đặt sân', icon: 'football-outline', bg: colors.primaryLight, color: colors.primary },
        { label: 'Lịch sử', icon: 'calendar-outline', bg: colors.surfaceVariant, color: colors.secondary },
        { label: 'Thanh toán', icon: 'card-outline', bg: colors.surfaceVariant, color: colors.danger },
        { label: 'Đánh giá', icon: 'star-outline', bg: colors.surfaceVariant, color: colors.accent },
    ], [colors]);

    const renderPitchCard = ({ item, index }: { item: ResPitchDTO; index: number }) => (
        <TouchableOpacity
            style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: BORDER_RADIUS.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: SPACING.md,
                marginRight: index % 2 === 0 ? SPACING.sm : 0,
                marginLeft: index % 2 === 1 ? SPACING.sm : 0,
            }}
            onPress={() => navigation.navigate('PitchDetail', { pitchId: item.id })}
            activeOpacity={0.85}
        >
            <View style={{ height: 110, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.pitchUrl ? (
                    <Image
                        source={{ uri: `${IMAGE_BASE_URL}${item.pitchUrl}` }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <Ionicons name="football" size={32} color={colors.primary} />
                )}
            </View>
            <View style={{ padding: SPACING.md }}>
                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary, marginTop: 2 }}>{PITCH_TYPE_LABEL[item.pitchType]}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: SPACING.xs }}>
                    <Ionicons name="location-outline" size={12} color={colors.textHint} />
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, flex: 1 }} numberOfLines={1}>{item.address}</Text>
                </View>
                {(item.hourlyPrices.length > 0 || item.pricePerHour > 0) && (
                    <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.secondary, marginTop: SPACING.xs }}>
                        từ {formatVND(item.hourlyPrices.length > 0 ? Math.min(...item.hourlyPrices.map((p) => p.pricePerHour)) : item.pricePerHour)}/giờ
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onLayout={(event) => {
                    layoutHeightRef.current = event.nativeEvent.layout.height;
                    updateBackToTopVisibility(0);
                }}
                onContentSizeChange={(_, h) => {
                    contentHeightRef.current = h;
                    updateBackToTopVisibility(0);
                }}
                onScroll={(event) => {
                    updateBackToTopVisibility(event.nativeEvent.contentOffset.y);
                }}
            >
                {/* Quick Actions */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg }}>
                    {QUICK_ACTIONS.map((action) => (
                        <TouchableOpacity key={action.label} style={{ alignItems: 'center', gap: SPACING.xs }} activeOpacity={0.7}>
                            <View style={{ width: 52, height: 52, borderRadius: BORDER_RADIUS.md, backgroundColor: action.bg, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name={action.icon as any} size={22} color={action.color} />
                            </View>
                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium }}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Featured Pitches */}
                <View style={{ marginBottom: SPACING.xl }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, marginBottom: SPACING.md }}>
                        <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Sân nổi bật</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Pitches' as any)}>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>Xem tất cả →</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={pitches}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderPitchCard}
                        numColumns={2}
                        scrollEnabled={false}
                        columnWrapperStyle={{ paddingHorizontal: SPACING.xl }}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

