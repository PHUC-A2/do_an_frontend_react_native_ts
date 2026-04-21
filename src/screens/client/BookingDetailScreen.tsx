import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClientScreenProps, ClientStackParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@config/theme';
import { bookingService } from '@services/booking.service';
import { ResBookingDTO } from '@/types/booking.types';
import { ResBookingEquipmentDTO } from '@/types/bookingEquipment.types';
import { BOOKING_STATUS_LABEL } from '@utils/constants';
import { BOOKING_EQUIPMENT_STATUS_META } from '@utils/constants/bookingEquipment.constants';
import { formatDateTime, formatTime } from '@utils/format/date';
import { formatVND } from '@utils/format/currency';
import { useAppDispatch } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';

type Props = ClientScreenProps<'BookingDetail'>;
type Nav  = NativeStackNavigationProp<ClientStackParamList>;

const STATUS_COLOR: Partial<Record<string, { text: string; bg: string }>> = {
    PENDING:   { text: '#F59E0B', bg: '#FEF3C7' },
    ACTIVE:    { text: '#16A34A', bg: '#DCFCE7' },
    CONFIRMED: { text: '#16A34A', bg: '#DCFCE7' },
    PAID:      { text: '#3B82F6', bg: '#EFF6FF' },
    CHECKIN:   { text: '#0EA5E9', bg: '#E0F2FE' },
    COMPLETED: { text: '#6B7280', bg: '#F3F4F6' },
    CANCELLED: { text: '#EF4444', bg: '#FEE2E2' },
    NO_SHOW:   { text: '#9333EA', bg: '#F5F3FF' },
};

function durationLabel(startISO: string, endISO: string, mins?: number): string {
    const m = mins ?? (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000;
    if (m <= 0) return '—';
    const h = Math.floor(m / 60);
    const rem = Math.round(m % 60);
    if (h > 0 && rem > 0) return `${h} giờ ${rem} phút`;
    if (h > 0) return `${h} giờ`;
    return `${rem} phút`;
}

const InfoRow = ({
    icon,
    label,
    value,
    valueColor,
    valueBold,
    colors,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    valueColor?: string;
    valueBold?: boolean;
    colors: any;
}) => (
    <View style={styles.infoRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={icon} size={15} color={colors.primary} />
        </View>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text
            style={[
                styles.infoValue,
                { color: valueColor ?? colors.textPrimary },
                valueBold && { fontWeight: FONT_WEIGHT.semibold },
            ]}
            numberOfLines={2}
        >
            {value}
        </Text>
    </View>
);

export default function BookingDetailScreen({ route }: Props) {
    const { bookingId } = route.params;
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<Nav>();
    const dispatch = useAppDispatch();

    const [booking, setBooking] = useState<ResBookingDTO | null>(null);
    const [equips, setEquips] = useState<ResBookingEquipmentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            bookingService.getBookingById(bookingId),
            bookingService.getBookingEquipments(bookingId).catch(() => ({ data: { data: [] } })),
        ])
            .then(([bRes, eRes]) => {
                if (cancelled) return;
                setBooking(bRes.data.data ?? null);
                setEquips((eRes.data.data ?? []).filter((e: ResBookingEquipmentDTO) => !e.deletedByClient));
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
                ]).start();
            })
            .catch(() => {
                if (!cancelled) setBooking(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [bookingId]);

    const handleCancel = () => {
        Alert.alert(
            'Hủy đặt sân',
            'Bạn có chắc muốn hủy lịch đặt này không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy lịch',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading('cancel');
                        try {
                            const res = await bookingService.cancelBooking(bookingId);
                            setBooking(res.data.data ?? null);
                            dispatch(fetchMyBookings());
                        } catch (e: any) {
                            Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể hủy lịch đặt');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Xóa lịch sử',
            'Bạn có muốn xóa lịch đặt này khỏi danh sách không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading('delete');
                        try {
                            await bookingService.deleteBooking(bookingId);
                            dispatch(fetchMyBookings());
                            navigation.goBack();
                        } catch (e: any) {
                            Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xóa');
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const shadowStyle = isDark ? {} : SHADOW.md;

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, marginTop: SPACING.md, fontSize: FONT_SIZE.sm }}>
                        Đang tải thông tin...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!booking) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
                <View style={styles.loadingCenter}>
                    <View style={[styles.errorIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginTop: SPACING.lg }}>
                        Không tìm thấy lịch đặt
                    </Text>
                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: SPACING.sm, textAlign: 'center' }}>
                        Lịch đặt này có thể đã bị xóa hoặc không tồn tại
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary, marginTop: SPACING.xl }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back-outline" size={16} color="#fff" />
                        <Text style={styles.retryBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const now = new Date();
    const isEnded    = new Date(booking.endDateTime) < now;
    const isPending  = booking.status === 'PENDING';
    const isActive   = booking.status === 'ACTIVE' || booking.status === 'CONFIRMED';
    const isPaid     = booking.status === 'PAID';
    const isCancelled = booking.status === 'CANCELLED';

    const canPay    = isActive && !isEnded;
    const canCancel = (isActive || isPending) && !isEnded;
    const canDelete = isPaid || isCancelled || isEnded;

    const statusMeta = STATUS_COLOR[booking.status] ?? { text: '#6B7280', bg: '#F3F4F6' };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
            <Animated.ScrollView
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Status banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusMeta.bg }]}>
                    <Ionicons
                        name={
                            isCancelled ? 'close-circle' :
                            isPaid ? 'card' :
                            isPending ? 'hourglass' :
                            isActive ? 'checkmark-circle' :
                            'football'
                        }
                        size={28}
                        color={statusMeta.text}
                    />
                    <Text style={[styles.statusBannerText, { color: statusMeta.text }]}>
                        {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                    </Text>
                    {isPending && (
                        <Text style={[styles.statusSubText, { color: statusMeta.text }]}>
                            Chờ admin xác nhận lịch đặt
                        </Text>
                    )}
                </View>

                {/* Pitch info card */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textHint }]}>Thông tin sân</Text>
                    <View style={styles.pitchRow}>
                        <View style={[styles.pitchIcon, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="football" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>
                                {booking.pitchName}
                            </Text>
                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: 2 }}>
                                Mã sân #{booking.pitchId}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Booking details card */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textHint }]}>Chi tiết lịch đặt</Text>

                    <InfoRow icon="time-outline"        label="Bắt đầu"    value={formatDateTime(booking.startDateTime)}           colors={colors} />
                    <InfoRow icon="time-outline"        label="Kết thúc"   value={formatDateTime(booking.endDateTime)}             colors={colors} />
                    <InfoRow icon="hourglass-outline"   label="Thời lượng" value={durationLabel(booking.startDateTime, booking.endDateTime, booking.durationMinutes)} colors={colors} />

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    <InfoRow icon="person-outline"      label="Người đặt"  value={booking.userName}                            colors={colors} />
                    {booking.contactPhone ? (
                        <InfoRow icon="call-outline"    label="Liên hệ"    value={booking.contactPhone}                        colors={colors} />
                    ) : null}

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    <View style={styles.priceRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryLight }]}>
                                <Ionicons name="cash-outline" size={15} color={colors.primary} />
                            </View>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tổng tiền</Text>
                        </View>
                        <Text style={[styles.priceValue, { color: colors.primary }]}>
                            {formatVND(booking.totalPrice)}
                        </Text>
                    </View>

                    {booking.note ? (
                        <>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <View style={styles.noteWrap}>
                                <Ionicons name="document-text-outline" size={14} color={colors.textHint} />
                                <Text style={[styles.noteText, { color: colors.textSecondary }]}>{booking.note}</Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Borrowed equipment card */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textHint }]}>Thiết bị mượn kèm</Text>
                    {equips.length === 0 ? (
                        <View style={styles.equipEmpty}>
                            <Ionicons name="construct-outline" size={28} color={colors.textHint} />
                            <Text style={[styles.equipEmptyText, { color: colors.textHint }]}>
                                Không có thiết bị mượn qua hệ thống
                            </Text>
                        </View>
                    ) : (
                        equips.map((eq, i) => {
                            const meta = BOOKING_EQUIPMENT_STATUS_META[eq.status];
                            return (
                                <View key={eq.id}>
                                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
                                    <View style={styles.equipRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 }}>
                                                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                                    {eq.equipmentName}
                                                </Text>
                                                <View style={[styles.equipBadge, { backgroundColor: meta.bgColor }]}>
                                                    <Text style={[styles.equipBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: SPACING.lg }}>
                                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>
                                                    Mượn: <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>{eq.quantity}</Text>
                                                </Text>
                                                {eq.status !== 'BORROWED' && (
                                                    <>
                                                        <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>
                                                            Tốt: <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: '#16A34A' }}>{eq.quantityReturnedGood ?? 0}</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>
                                                            Hỏng: <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: '#F59E0B' }}>{eq.quantityDamaged ?? 0}</Text>
                                                        </Text>
                                                        <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>
                                                            Mất: <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: '#EF4444' }}>{eq.quantityLost ?? 0}</Text>
                                                        </Text>
                                                    </>
                                                )}
                                            </View>
                                            {eq.status === 'LOST' && eq.penaltyAmount > 0 && (
                                                <Text style={{ fontSize: FONT_SIZE.xs, color: '#EF4444', marginTop: 2 }}>
                                                    Phí đền bù: {formatVND(eq.penaltyAmount)}
                                                </Text>
                                            )}
                                            {eq.borrowConditionNote ? (
                                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }}>
                                                    Mượn: {eq.borrowConditionNote}
                                                </Text>
                                            ) : null}
                                            {eq.returnConditionNote ? (
                                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }}>
                                                    Trả: {eq.returnConditionNote}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Timestamps */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint }}>
                        Tạo: {formatDateTime(booking.createdAt)}
                    </Text>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint }}>
                        Cập nhật: {formatDateTime(booking.updatedAt)}
                    </Text>
                </View>
            </Animated.ScrollView>

            {/* Bottom action bar */}
            {(canPay || canCancel || canDelete) && (
                <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, ...shadowStyle }]}>
                    {canDelete && (
                        <TouchableOpacity
                            style={[styles.bottomBtn, { borderColor: colors.border, flex: 0.7 }]}
                            onPress={handleDelete}
                            disabled={!!actionLoading}
                        >
                            {actionLoading === 'delete' ? (
                                <ActivityIndicator size="small" color={colors.textHint} />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={16} color={colors.textHint} />
                                    <Text style={[styles.bottomBtnText, { color: colors.textHint }]}>Xóa</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {canCancel && (
                        <TouchableOpacity
                            style={[styles.bottomBtn, { borderColor: '#EF4444', flex: 1 }]}
                            onPress={handleCancel}
                            disabled={!!actionLoading}
                        >
                            {actionLoading === 'cancel' ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <>
                                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                                    <Text style={[styles.bottomBtnText, { color: '#EF4444' }]}>Hủy lịch</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {canPay && (
                        <TouchableOpacity
                            style={[styles.bottomBtnPrimary, { backgroundColor: colors.primary, flex: 1.4 }]}
                            onPress={() => navigation.navigate('PaymentQR', { bookingId: booking.id })}
                        >
                            <Ionicons name="card-outline" size={16} color="#fff" />
                            <Text style={styles.bottomBtnPrimaryText}>Thanh toán ngay</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    errorIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    retryBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

    statusBanner: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statusBannerText: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    statusSubText: { fontSize: FONT_SIZE.sm, opacity: 0.8, textAlign: 'center' },

    card: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    pitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    pitchIcon: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    infoIconWrap: {
        width: 28,
        height: 28,
        borderRadius: BORDER_RADIUS.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: { width: 84, fontSize: FONT_SIZE.sm },
    infoValue: { flex: 1, fontSize: FONT_SIZE.sm, textAlign: 'right' },
    divider: { height: 1, marginVertical: SPACING.xs },

    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
    },
    priceValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },

    noteWrap: {
        flexDirection: 'row',
        gap: 6,
        paddingTop: SPACING.sm,
    },
    noteText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20 },

    equipEmpty: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    equipEmptyText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
    equipRow: { paddingVertical: SPACING.sm },
    equipBadge: {
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
    },
    equipBadgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: SPACING.sm,
        padding: SPACING.lg,
        borderTopWidth: 1,
    },
    bottomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        minHeight: 48,
    },
    bottomBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    bottomBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        minHeight: 48,
    },
    bottomBtnPrimaryText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});
