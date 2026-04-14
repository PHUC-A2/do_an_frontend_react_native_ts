import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';
import { ResPitchDTO, PitchStatus } from '@/types/pitch.types';
import { PITCH_TYPE_LABEL, PITCH_STATUS_LABEL, IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';

interface PitchCardProps {
    item: ResPitchDTO;
    index: number;
    onPress: () => void;
    onBook: () => void;
}

const STATUS_COLOR: Record<PitchStatus, { bg: string; text: string }> = {
    ACTIVE: { bg: '#DCFCE7', text: '#16A34A' },
    INACTIVE: { bg: '#FEE2E2', text: '#EF4444' },
    MAINTENANCE: { bg: '#FEF3C7', text: '#F59E0B' },
};

export default function PitchCard({ item, index, onPress, onBook }: PitchCardProps) {
    const { colors, isDark } = useTheme();

    // Entrance animation: fade + slide up
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(28)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const delay = index * 80;
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();
        }, delay);
        return () => clearTimeout(timer);
    }, []);

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
        }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
        }).start();
    };

    const minPrice = item.hourlyPrices.length > 0
        ? Math.min(...item.hourlyPrices.map((p) => p.pricePerHour))
        : item.pricePerHour > 0 ? item.pricePerHour : null;

    const timeLabel = item.open24h
        ? 'Mở cửa 24h'
        : `${item.openTime?.slice(0, 5) ?? ''} - ${item.closeTime?.slice(0, 5) ?? ''}`;

    const statusColor = STATUS_COLOR[item.status] ?? STATUS_COLOR.INACTIVE;

    const shadowStyle = isDark ? {} : SHADOW.md;

    return (
        <Animated.View style={[{ marginBottom: SPACING.md, opacity, transform: [{ translateY }, { scale }] }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: BORDER_RADIUS.lg,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...shadowStyle,
                }}
            >
                {/* Image — 16:9 */}
                {item.pitchUrl ? (
                    <Image
                        source={{ uri: `${IMAGE_BASE_URL}${item.pitchUrl}` }}
                        style={{ width: '100%', aspectRatio: 16 / 9 }}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={{
                            width: '100%',
                            aspectRatio: 16 / 9,
                            backgroundColor: colors.primaryLight,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="football" size={48} color={colors.primary} />
                    </View>
                )}

                <View style={{ padding: SPACING.lg, gap: SPACING.sm }}>
                    {/* Name */}
                    <Text
                        style={{
                            fontSize: FONT_SIZE.lg,
                            fontWeight: FONT_WEIGHT.bold,
                            color: colors.textPrimary,
                        }}
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>

                    {/* Address */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                        <Ionicons name="location-outline" size={14} color={colors.textHint} />
                        <Text
                            style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}
                            numberOfLines={1}
                        >
                            {item.address}
                        </Text>
                    </View>

                    {/* Type badge + Status badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
                        <View
                            style={{
                                backgroundColor: colors.primaryLight,
                                borderRadius: BORDER_RADIUS.full,
                                paddingHorizontal: SPACING.md,
                                paddingVertical: SPACING.xs,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Ionicons name="football-outline" size={12} color={colors.primary} />
                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>
                                {PITCH_TYPE_LABEL[item.pitchType]}
                            </Text>
                        </View>

                        <View
                            style={{
                                backgroundColor: statusColor.bg,
                                borderRadius: BORDER_RADIUS.full,
                                paddingHorizontal: SPACING.md,
                                paddingVertical: SPACING.xs,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: statusColor.text,
                                }}
                            />
                            <Text style={{ fontSize: FONT_SIZE.xs, color: statusColor.text, fontWeight: FONT_WEIGHT.semibold }}>
                                {PITCH_STATUS_LABEL[item.status]}
                            </Text>
                        </View>
                    </View>

                    {/* Price + Time */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                            <Ionicons name="cash-outline" size={15} color={colors.secondary} />
                            <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.secondary }}>
                                {minPrice != null ? `từ ${formatVND(minPrice)}/giờ` : 'Liên hệ'}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                            <Ionicons name="time-outline" size={15} color={colors.textHint} />
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                                {timeLabel}
                            </Text>
                        </View>
                    </View>

                    {/* Rating */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                        <Ionicons
                            name={(item.averageRating ?? 0) > 0 ? 'star' : 'star-outline'}
                            size={14}
                            color={colors.accent}
                        />
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                            {(item.averageRating ?? 0) > 0
                                ? `${item.averageRating!.toFixed(1)} (${item.reviewCount} đánh giá)`
                                : 'Chưa có đánh giá'}
                        </Text>
                    </View>

                    {/* Book button */}
                    <TouchableOpacity
                        style={{
                            marginTop: SPACING.sm,
                            backgroundColor: item.status === 'ACTIVE' ? colors.primary : colors.textDisabled,
                            borderRadius: BORDER_RADIUS.md,
                            paddingVertical: SPACING.md,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SPACING.sm,
                            minHeight: 44,
                        }}
                        onPress={item.status === 'ACTIVE' ? onBook : undefined}
                        disabled={item.status !== 'ACTIVE'}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="calendar-outline" size={18} color="#fff" />
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#fff' }}>
                            {item.status === 'ACTIVE' ? 'Đặt sân' : 'Không khả dụng'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}
