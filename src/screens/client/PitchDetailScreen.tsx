import React, { useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchPitchById } from '@redux/slices/pitchSlice';
import { ClientScreenProps } from '@navigation/types';
import Button from '@components/common/Button';
import { useTheme } from '@config/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { PITCH_TYPE_LABEL, PITCH_STATUS_LABEL, IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';

type Props = ClientScreenProps<'PitchDetail'>;

export default function PitchDetailScreen({ route, navigation }: Props) {
    const { pitchId } = route.params;
    const dispatch = useAppDispatch();
    const { colors } = useTheme();
    const { selectedPitch, isLoading } = useAppSelector((s) => s.pitch);
    const insets = useSafeAreaInsets();
    const CTA_HEIGHT = 72 + insets.bottom;

    useEffect(() => {
        dispatch(fetchPitchById(pitchId));
    }, [pitchId]);

    useEffect(() => {
        if (selectedPitch) {
            navigation.setOptions({ title: selectedPitch.name });
        }
    }, [selectedPitch?.name]);

    if (isLoading || !selectedPitch) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }} edges={['bottom', 'left', 'right']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    const pitch = selectedPitch;
    const imageUri = pitch.pitchUrl
        ? (pitch.pitchUrl.startsWith('http') ? pitch.pitchUrl : `${IMAGE_BASE_URL}${pitch.pitchUrl}`)
        : null;
    const statusColor = pitch.status === 'ACTIVE' ? colors.success : pitch.status === 'MAINTENANCE' ? colors.warning : colors.danger;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: CTA_HEIGHT + 16 }}>

                {/* Hero image */}
                <View style={[styles.heroWrapper, { backgroundColor: colors.primaryLight }]}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <Ionicons name="football" size={72} color={colors.primary} />
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + 'EE' }]}>
                        <Text style={styles.statusBadgeText}>{PITCH_STATUS_LABEL[pitch.status]}</Text>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

                    {/* Name + type */}
                    <View style={styles.titleRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>{pitch.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.typeText, { color: colors.primary }]}>{PITCH_TYPE_LABEL[pitch.pitchType]}</Text>
                        </View>
                    </View>

                    {/* Star rating */}
                    {(pitch.averageRating ?? 0) > 0 && (
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons
                                    key={s}
                                    name={s <= Math.round(pitch.averageRating!) ? 'star' : 'star-outline'}
                                    size={14}
                                    color={colors.accent}
                                />
                            ))}
                            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                                {pitch.averageRating!.toFixed(1)} · {pitch.reviewCount} đánh giá
                            </Text>
                        </View>
                    )}

                    {/* Address — tap to open Google Maps */}
                    <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(pitch.address)}`)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>{pitch.address}</Text>
                        <Text style={[styles.infoText, { color: colors.textHint }]}>Google Maps</Text>
                        <Ionicons name="location" size={14} color={colors.textHint} />
                    </TouchableOpacity>

                    {/* Operating hours */}
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {pitch.open24h ? 'Mở cửa 24/7' : `${pitch.openTime?.slice(0, 5) ?? '?'} – ${pitch.closeTime?.slice(0, 5) ?? '?'}`}
                        </Text>
                        {pitch.open24h && (
                            <View style={[styles.chip, { backgroundColor: colors.success + '22' }]}>
                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.success, fontWeight: FONT_WEIGHT.semibold }}>24/7</Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    {/* Dimensions */}
                    {(pitch.length || pitch.width || pitch.height) && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Kích thước sân</Text>
                            <View style={styles.dimensionRow}>
                                {pitch.length && (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="resize-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.length}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Dài</Text>
                                    </View>
                                )}
                                {pitch.width && (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.width}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Rộng</Text>
                                    </View>
                                )}
                                {pitch.height && (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="arrow-up-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.height}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Cao</Text>
                                    </View>
                                )}
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    )}

                    {/* Price table */}
                    {pitch.hourlyPrices.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bảng giá</Text>
                            <View style={[styles.priceTable, { borderColor: colors.border }]}>
                                <View style={[styles.priceTableHeader, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.priceColHead, { color: colors.primary }]}>Khung giờ</Text>
                                    <Text style={[styles.priceColHead, { color: colors.primary, textAlign: 'right' }]}>Giá/giờ</Text>
                                </View>
                                {pitch.hourlyPrices.map((p, i) => (
                                    <View
                                        key={p.startTime}
                                        style={[styles.priceTableRow, { backgroundColor: i % 2 === 0 ? colors.surface : colors.surfaceVariant, borderTopColor: colors.divider }]}
                                    >
                                        <View style={styles.priceTimeCell}>
                                            <Ionicons name="time-outline" size={12} color={colors.textHint} />
                                            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                                                {p.startTime.slice(0, 5)} – {p.endTime.slice(0, 5)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.priceValue, { color: colors.primary }]}>{formatVND(p.pricePerHour)}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    )}

                    {/* Description */}
                    {pitch.description && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mô tả</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>{pitch.description}</Text>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Fixed bottom CTA */}
            <View style={[styles.cta, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom || SPACING.lg }]}>
                <View style={styles.ctaPrice}>
                    <Text style={[styles.ctaPriceLabel, { color: colors.textHint }]}>Từ</Text>
                    <Text style={[styles.ctaPriceValue, { color: colors.primary }]}>
                        {formatVND(pitch.hourlyPrices[0]?.pricePerHour ?? pitch.pricePerHour)}
                    </Text>
                    <Text style={[styles.ctaPriceLabel, { color: colors.textHint }]}>/giờ</Text>
                </View>
                <View style={styles.ctaButton}>
                    <Button
                        title="Đặt sân ngay"
                        onPress={() => navigation.navigate('BookingTimeline', { pitchId: pitch.id })}
                        disabled={pitch.status !== 'ACTIVE'}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    heroWrapper: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroImage: { width: '100%', height: '100%' },
    statusBadge: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
    },
    statusBadgeText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: FONT_WEIGHT.semibold },
    card: {
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.xl,
        ...SHADOW.sm,
    },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
    name: { flex: 1, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, marginRight: SPACING.sm },
    typeBadge: { borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
    typeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: SPACING.md },
    ratingText: { fontSize: FONT_SIZE.sm, marginLeft: SPACING.xs },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    infoText: { fontSize: FONT_SIZE.md },
    chip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginLeft: SPACING.xs },
    divider: { height: 1, marginVertical: SPACING.lg },
    sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.md },
    dimensionRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
    dimCard: { flex: 1, alignItems: 'center', borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, gap: SPACING.xs },
    dimValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    dimLabel: { fontSize: FONT_SIZE.xs },
    priceTable: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, overflow: 'hidden', marginBottom: SPACING.sm },
    priceTableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    priceColHead: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    priceTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderTopWidth: 1 },
    priceTimeCell: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    priceLabel: { fontSize: FONT_SIZE.sm },
    priceValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
    description: { fontSize: FONT_SIZE.md, lineHeight: 22 },
    cta: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderTopWidth: 1,
        gap: SPACING.md,
    },
    ctaPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    ctaPriceLabel: { fontSize: FONT_SIZE.sm },
    ctaPriceValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    ctaButton: { flex: 1 },
});

