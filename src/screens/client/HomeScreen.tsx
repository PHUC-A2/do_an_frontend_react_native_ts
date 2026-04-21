import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    DeviceEventEmitter,
    useWindowDimensions,
    Animated,
    Easing,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
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
import { fetchNotifications } from '@redux/slices/notificationSlice';
import { useAuth } from '@hooks/useAuth';
import { ClientStackParamList, ClientTabParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import type { AppColors } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { ResPitchDTO } from '@/types/pitch.types';
import { PITCH_TYPE_LABEL, IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';
import { CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, CLIENT_SCROLL_TO_TOP_EVENT } from '@components/common/chat/chat.constants';

type Nav = CompositeNavigationProp<
    BottomTabNavigationProp<ClientTabParamList, 'Home'>,
    NativeStackNavigationProp<ClientStackParamList>
>;

const BANNER_AUTO_MS = 4000;
const BANNER_HEIGHT_RATIO = 0.38;

type BannerItem = { id: string; title: string; subtitle: string; colors: [string, string]; icon: keyof typeof Ionicons.glyphMap };

const DEFAULT_BANNERS: BannerItem[] = [
    { id: '1', title: 'Đặt sân trong vài phút', subtitle: 'Chọn khung giờ, xác nhận nhanh', colors: ['#15803D', '#16A34A'], icon: 'flash-outline' },
    { id: '2', title: 'Ưu đãi cuối tuần', subtitle: 'Nhiều sân giá tốt', colors: ['#0369A1', '#0EA5E9'], icon: 'pricetag-outline' },
    { id: '3', title: 'Thanh toán linh hoạt', subtitle: 'QR & theo dõi lịch dễ dàng', colors: ['#A16207', '#EAB308'], icon: 'wallet-outline' },
];

// —— Banner carousel (RN ScrollView + RN Animated dots qua state — không Reanimated) ——

type BannerCarouselProps = {
    width: number;
    isDark: boolean;
    textInverse: string;
};

const BannerCarousel = memo(function BannerCarousel({ width, isDark, textInverse }: BannerCarouselProps) {
    const bannerHeight = Math.round(width * BANNER_HEIGHT_RATIO);
    const list = DEFAULT_BANNERS;
    const bannerScrollRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const bannerCount = list.length;
    const indexRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const userDraggingRef = useRef(false);
    const lastScrollPage = useRef(0);

    const inactiveDot = isDark ? '#94A3B8' : '#64748B';

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const goToPage = useCallback(
        (page: number, animated: boolean) => {
            const clamped = Math.max(0, Math.min(bannerCount - 1, page));
            indexRef.current = clamped;
            lastScrollPage.current = clamped;
            setActiveIndex(clamped);
            bannerScrollRef.current?.scrollTo({ x: clamped * width, y: 0, animated });
        },
        [bannerCount, width],
    );

    const startTimer = useCallback(() => {
        clearTimer();
        if (bannerCount <= 1) return;
        timerRef.current = setInterval(() => {
            if (userDraggingRef.current) return;
            const next = (indexRef.current + 1) % bannerCount;
            goToPage(next, true);
        }, BANNER_AUTO_MS);
    }, [bannerCount, clearTimer, goToPage]);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            startTimer();
        });
        return () => {
            cancelAnimationFrame(id);
            clearTimer();
        };
    }, [startTimer, clearTimer, width]);

    const onBannerScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
            if (page !== lastScrollPage.current) {
                lastScrollPage.current = page;
                setActiveIndex(Math.max(0, Math.min(bannerCount - 1, page)));
            }
        },
        [bannerCount, width],
    );

    const onBeginDrag = useCallback(() => {
        userDraggingRef.current = true;
        clearTimer();
    }, [clearTimer]);

    const onMomentumEnd = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            userDraggingRef.current = false;
            const x = e.nativeEvent.contentOffset.x;
            const page = Math.round(x / Math.max(1, width));
            const clamped = Math.max(0, Math.min(bannerCount - 1, page));
            indexRef.current = clamped;
            lastScrollPage.current = clamped;
            setActiveIndex(clamped);
            startTimer();
        },
        [bannerCount, startTimer, width],
    );

    return (
        <View style={{ marginBottom: SPACING.lg }}>
            <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                scrollEventThrottle={32}
                onScroll={onBannerScroll}
                onScrollBeginDrag={onBeginDrag}
                onMomentumScrollEnd={onMomentumEnd}
                keyboardShouldPersistTaps="handled"
            >
                {list.map((b) => (
                    <View key={b.id} style={{ width, height: bannerHeight, paddingHorizontal: SPACING.xl }}>
                        <View
                            style={{
                                flex: 1,
                                borderRadius: BORDER_RADIUS.xl,
                                overflow: 'hidden',
                                flexDirection: 'row',
                                ...SHADOW.md,
                            }}
                        >
                            <View style={{ flex: 1, backgroundColor: b.colors[0], justifyContent: 'center', padding: SPACING.xl }}>
                                <Ionicons name={b.icon} size={40} color={textInverse} style={{ opacity: 0.9, marginBottom: SPACING.sm }} />
                                <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: textInverse }}>{b.title}</Text>
                                <Text style={{ fontSize: FONT_SIZE.sm, color: textInverse, opacity: 0.92, marginTop: 6 }}>{b.subtitle}</Text>
                            </View>
                            <View style={{ width: '38%', backgroundColor: b.colors[1] }} />
                        </View>
                    </View>
                ))}
            </ScrollView>
            {bannerCount > 1 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: SPACING.sm }}>
                    {list.map((b, i) => {
                        const on = i === activeIndex;
                        return (
                            <View
                                key={b.id}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: inactiveDot,
                                    opacity: on ? 1 : 0.35,
                                    transform: [{ scale: on ? 1.14 : 1 }],
                                }}
                            />
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
});

// —— Pitch card (lưới 2 cột) ——————————————————————————————————————————————————

type PitchGridCardProps = {
    pitch: ResPitchDTO;
    index: number;
    colors: AppColors;
    onPress: (id: number) => void;
};

const PitchGridCard = memo(function PitchGridCard({ pitch, index, colors, onPress }: PitchGridCardProps) {
    const uri = pitch.pitchUrl ? `${IMAGE_BASE_URL}${pitch.pitchUrl}` : null;
    const handlePress = useCallback(() => onPress(pitch.id), [onPress, pitch.id]);
    const minPrice =
        pitch.hourlyPrices.length > 0 ? Math.min(...pitch.hourlyPrices.map((p) => p.pricePerHour)) : pitch.pricePerHour;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.88}
            style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: BORDER_RADIUS.lg,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                marginBottom: SPACING.md,
                marginRight: index % 2 === 0 ? SPACING.sm : 0,
                marginLeft: index % 2 === 1 ? SPACING.sm : 0,
                ...SHADOW.sm,
            }}
        >
            <View style={{ height: 110, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Ionicons name="football" size={32} color={colors.primary} />}
            </View>
            <View style={{ padding: SPACING.md }}>
                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }} numberOfLines={1}>
                    {pitch.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={12} color={colors.textHint} />
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, flex: 1 }} numberOfLines={1}>
                        {pitch.address}
                    </Text>
                </View>
                {(pitch.hourlyPrices.length > 0 || pitch.pricePerHour > 0) && (
                    <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.secondary, marginTop: SPACING.xs }}>
                        từ {formatVND(minPrice)}/giờ
                    </Text>
                )}
                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary, marginTop: 4 }}>{PITCH_TYPE_LABEL[pitch.pitchType]}</Text>
            </View>
        </TouchableOpacity>
    );
});

// —— Sân nổi bật: 2 card / hàng + marquee ngang (RN Animated, không Reanimated) ——

type PitchPairSegmentProps = {
    left: ResPitchDTO;
    right: ResPitchDTO | null;
    segmentWidth: number;
    colors: AppColors;
    onPitchPress: (id: number) => void;
};

const PitchPairSegment = memo(function PitchPairSegment({ left, right, segmentWidth, colors, onPitchPress }: PitchPairSegmentProps) {
    return (
        <View style={{ width: segmentWidth, flexDirection: 'row' }}>
            <PitchGridCard pitch={left} index={0} colors={colors} onPress={onPitchPress} />
            {right ? (
                <PitchGridCard pitch={right} index={1} colors={colors} onPress={onPitchPress} />
            ) : (
                <View style={{ flex: 1 }} />
            )}
        </View>
    );
});

type FeaturedPitchesMarqueeProps = {
    width: number;
    pitches: ResPitchDTO[];
    colors: AppColors;
    onPitchPress: (id: number) => void;
};

const MARQUEE_MS_PER_PX = 22;

const FeaturedPitchesMarquee = memo(function FeaturedPitchesMarquee({ width, pitches, colors, onPitchPress }: FeaturedPitchesMarqueeProps) {
    const segmentWidth = Math.max(200, width - SPACING.xl * 2);
    const pairs = useMemo(() => {
        const out: { left: ResPitchDTO; right: ResPitchDTO | null }[] = [];
        for (let i = 0; i < pitches.length; i += 2) {
            const left = pitches[i];
            if (!left) break;
            out.push({ left, right: pitches[i + 1] ?? null });
        }
        return out;
    }, [pitches]);

    const stripWidth = pairs.length * segmentWidth;
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        scrollX.setValue(0);
        if (pairs.length === 0 || stripWidth <= 0) return;

        const durationMs = Math.min(48000, Math.max(9000, stripWidth * MARQUEE_MS_PER_PX));
        const anim = Animated.loop(
            Animated.timing(scrollX, {
                toValue: -stripWidth,
                duration: durationMs,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        anim.start();
        return () => {
            anim.stop();
        };
    }, [pairs.length, scrollX, stripWidth]);

    if (pitches.length === 0) {
        return (
            <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textHint }}>Đang cập nhật danh sách sân…</Text>
            </View>
        );
    }

    const renderStrip = (suffix: string) =>
        pairs.map((pair, idx) => (
            <PitchPairSegment
                key={`${suffix}-${pair.left.id}-${idx}`}
                left={pair.left}
                right={pair.right}
                segmentWidth={segmentWidth}
                colors={colors}
                onPitchPress={onPitchPress}
            />
        ));

    return (
        <View style={{ paddingHorizontal: SPACING.xl, overflow: 'hidden', paddingBottom: SPACING.sm }}>
            <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollX }] }}>
                <View style={{ flexDirection: 'row' }}>{renderStrip('a')}</View>
                <View style={{ flexDirection: 'row' }}>{renderStrip('b')}</View>
            </Animated.View>
        </View>
    );
});

// —— Screen —————————————————————————————————————————————————————————————————

export default function HomeScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { width } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const { isAuthenticated } = useAuth();
    const { pitches, isLoading } = useAppSelector((s: RootState) => s.pitch);
    const scrollRef = useRef<ScrollView>(null);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);

    const updateBackToTopVisibility = useCallback((scrollY: number) => {
        const canScroll = contentHeightRef.current > layoutHeightRef.current + 12;
        const visible = canScroll && scrollY > 120;
        DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, visible);
    }, []);

    useEffect(() => {
        dispatch(fetchPitches({ page: 1, size: 5 }));
    }, [dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchNotifications());
        }
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(CLIENT_SCROLL_TO_TOP_EVENT, () => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
        return () => {
            subscription.remove();
            DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, false);
        };
    }, []);

    const onPitchPress = useCallback(
        (id: number) => {
            navigation.navigate('PitchDetail', { pitchId: id });
        },
        [navigation],
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
                <BannerCarousel width={width} isDark={isDark} textInverse={colors.textInverse} />

                <View style={{ paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Sân nổi bật</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Pitches' as never)} hitSlop={8}>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>Xem tất cả →</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textHint }}>Đang tải…</Text>
                    </View>
                ) : (
                    <FeaturedPitchesMarquee width={width} pitches={pitches} colors={colors} onPitchPress={onPitchPress} />
                )}

                <View style={{ height: SPACING.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}
