import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ClientScreenProps } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import { bookingService } from '@services/booking.service';
import { pitchService } from '@services/pitch.service';
import { useAppDispatch } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';
import { fetchNotifications } from '@redux/slices/notificationSlice';
import { ResPitchDTO } from '@/types/pitch.types';
import { ResPitchEquipmentDTO } from '@/types/pitchEquipment.types';
import { formatVND } from '@utils/format/currency';
import {
    calcEstimatedPrice,
    durationLabel,
    durationMinutes,
    EquipmentBorrowSection,
    normalizeImageUri,
    PitchSummaryCard,
} from '@components/client/booking/BookingShared';

type Props = ClientScreenProps<'CreateBooking'>;

function formatDateTime(iso: string): string {
    const [date, time] = iso.split('T');
    const [y, m, d] = date.split('-');
    return `${time.slice(0, 5)} ngày ${d}/${m}/${y}`;
}

export default function CreateBookingScreen({ route, navigation }: Props) {
    const { pitchId, startTime, endTime } = route.params;
    const { colors } = useTheme();
    const dispatch = useAppDispatch();

    const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
    const [pitchEquipments, setPitchEquipments] = useState<ResPitchEquipmentDTO[]>([]);
    const [borrowableEquipments, setBorrowableEquipments] = useState<ResPitchEquipmentDTO[]>([]);
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

    const [rowOn, setRowOn] = useState<Record<number, boolean>>({});
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [rowNotes, setRowNotes] = useState<Record<number, string>>({});
    const [borrowNote, setBorrowNote] = useState('');
    const [borrowConditionAcknowledged, setBorrowConditionAcknowledged] = useState(false);
    const [borrowReportPrintOptIn, setBorrowReportPrintOptIn] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setFetchingData(true);
        Promise.all([
            pitchService.getPitchById(pitchId).catch(() => ({ data: { data: null } })),
            bookingService.getPitchEquipments(pitchId).catch(() => ({ data: { data: [] } })),
            bookingService.getPitchBorrowableEquipments(pitchId).catch(() => ({ data: { data: [] } })),
        ])
            .then(([pitchRes, allEquipRes, borrowRes]) => {
                if (cancelled) return;
                setPitch(pitchRes.data.data ?? null);
                setPitchEquipments(allEquipRes.data.data ?? []);
                setBorrowableEquipments(borrowRes.data.data ?? []);
            })
            .finally(() => {
                if (!cancelled) setFetchingData(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pitchId]);

    useEffect(() => {
        const nextOn: Record<number, boolean> = {};
        const nextQty: Record<number, number> = {};
        for (const item of borrowableEquipments) {
            nextOn[item.id] = false;
            nextQty[item.id] = 0;
        }
        setRowOn(nextOn);
        setQuantities(nextQty);
        setRowNotes({});
    }, [borrowableEquipments]);

    const pitchImageUri = useMemo(
        () => normalizeImageUri(pitch?.pitchUrl ?? pitch?.imageUrl ?? null),
        [pitch],
    );

    const dimensionStr = useMemo(() => {
        if (pitch?.length != null && pitch?.width != null) {
            return `${pitch.length}m × ${pitch.width}m${pitch.height != null ? ` × ${pitch.height}m` : ''}`;
        }
        return 'Chưa cập nhật';
    }, [pitch]);

    const areaStr = useMemo(() => {
        if (pitch?.length != null && pitch?.width != null) {
            return `${Number((pitch.length * pitch.width).toFixed(2)).toLocaleString('vi-VN')} m²`;
        }
        return 'Chưa cập nhật';
    }, [pitch]);

    const pitchEquipmentSummary = useMemo(() => {
        if (pitchEquipments.length === 0) return 'Chưa cập nhật';
        return pitchEquipments
            .map((item) => {
                const role = item.equipmentMobility === 'MOVABLE' ? 'Mượn được' : 'Cố định';
                const spec = item.specification ? ` - ${item.specification}` : '';
                return `${item.equipmentName} (${role}) x${item.quantity}${spec}`;
            })
            .join('; ');
    }, [pitchEquipments]);

    const estimatedPrice = useMemo(
        () => (pitch ? calcEstimatedPrice(startTime, endTime, pitch) : 0),
        [pitch, startTime, endTime],
    );

    const borrowLines = useMemo(
        () =>
            borrowableEquipments.flatMap((item) => {
                if (!rowOn[item.id]) return [];
                const quantity = quantities[item.id] ?? 0;
                if (quantity <= 0) return [];
                const perItemNote = rowNotes[item.id]?.trim();
                const globalNote = borrowNote.trim();
                return [{
                    equipmentId: item.equipmentId,
                    equipmentMobility: item.equipmentMobility,
                    quantity,
                    borrowConditionNote: perItemNote || globalNote || undefined,
                }];
            }),
        [borrowNote, borrowableEquipments, quantities, rowNotes, rowOn],
    );

    const handleBook = useCallback(async () => {
        if (durationMinutes(startTime, endTime) < 30) {
            Alert.alert('Không hợp lệ', 'Thời lượng đặt sân tối thiểu là 30 phút.');
            return;
        }
        if (borrowLines.length > 0 && !borrowConditionAcknowledged) {
            Alert.alert('Thiếu xác nhận', 'Vui lòng xác nhận đã kiểm tra tình trạng thiết bị trước khi gửi yêu cầu đặt sân.');
            return;
        }

        setLoading(true);
        try {
            const res = await bookingService.createBooking({
                pitchId,
                startDateTime: startTime,
                endDateTime: endTime,
                contactPhone: phone.trim() || undefined,
            });
            const booking = res.data.data!;

            if (booking?.id && borrowLines.length > 0) {
                await Promise.all(
                    borrowLines.map((line) =>
                        bookingService.borrowEquipment({
                            bookingId: booking.id,
                            equipmentId: line.equipmentId,
                            quantity: line.quantity,
                            equipmentMobility: line.equipmentMobility,
                            borrowConditionNote: line.borrowConditionNote,
                            borrowConditionAcknowledged: true,
                            borrowReportPrintOptIn,
                        }).catch(() => null),
                    ),
                );
            }

            await Promise.all([
                dispatch(fetchMyBookings(undefined)),
                dispatch(fetchNotifications()),
            ]);

            Alert.alert('Đặt sân thành công', 'Yêu cầu đặt sân đã được gửi. Chờ admin xác nhận.', [
                {
                    text: 'Xem đặt sân',
                    onPress: () => navigation.replace('BookingDetail', { bookingId: booking.id }),
                },
            ]);
        } catch (err: any) {
            Alert.alert('Đặt sân thất bại', err?.response?.data?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [pitchId, startTime, endTime, phone, borrowLines, borrowConditionAcknowledged, borrowReportPrintOptIn, dispatch, navigation]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            <Modal visible={!!previewImageUri} transparent animationType="fade" onRequestClose={() => setPreviewImageUri(null)}>
                <TouchableWithoutFeedback onPress={() => setPreviewImageUri(null)}>
                    <View style={{ flex: 1, backgroundColor: '#000000DD', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
                        {previewImageUri ? <Image source={{ uri: previewImageUri }} style={{ width: '100%', height: '70%' }} resizeMode="contain" /> : null}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                <PitchSummaryCard
                    colors={colors}
                    pitch={pitch}
                    pitchImageUri={pitchImageUri}
                    dimensionStr={dimensionStr}
                    areaStr={areaStr}
                    pitchEquipmentSummary={pitchEquipmentSummary}
                    onPreviewImage={setPreviewImageUri}
                    loading={fetchingData}
                />

                <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Thông tin đặt sân</Text>
                    </View>

                    <View style={{ padding: SPACING.md, gap: SPACING.md }}>
                        <View style={{ backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md, gap: SPACING.sm }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
                                <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Bắt đầu</Text>
                                <Text style={{ flex: 1.2, textAlign: 'right', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                    {formatDateTime(startTime)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
                                <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Kết thúc</Text>
                                <Text style={{ flex: 1.2, textAlign: 'right', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                    {formatDateTime(endTime)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
                                <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Thời lượng</Text>
                                <Text style={{ flex: 1.2, textAlign: 'right', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                    {durationLabel(durationMinutes(startTime, endTime))}
                                </Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: colors.divider }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
                                <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Tạm tính</Text>
                                <Text style={{ flex: 1.2, textAlign: 'right', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#F59E0B' }}>
                                    {pitch ? formatVND(estimatedPrice) : '--'}
                                </Text>
                            </View>
                        </View>

                        <View>
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm }}>
                                Số điện thoại liên hệ
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: SPACING.md }}>
                                <Ionicons name="call-outline" size={16} color={colors.textHint} />
                                <TextInput
                                    style={{ flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.md }}
                                    placeholder="Nhập số điện thoại (tuỳ chọn)"
                                    placeholderTextColor={colors.textHint}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <EquipmentBorrowSection
                    colors={colors}
                    loading={fetchingData}
                    borrowableEquipments={borrowableEquipments}
                    rowOn={rowOn}
                    quantities={quantities}
                    rowNotes={rowNotes}
                    borrowNote={borrowNote}
                    borrowConditionAcknowledged={borrowConditionAcknowledged}
                    borrowReportPrintOptIn={borrowReportPrintOptIn}
                    onToggleRow={(item, value, maxQty) => {
                        setRowOn((prev) => ({ ...prev, [item.id]: value }));
                        setQuantities((prev) => ({ ...prev, [item.id]: value ? Math.max(1, Math.min(prev[item.id] || 1, maxQty)) : 0 }));
                    }}
                    onDecreaseQty={(item) => setQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? 1) - 1) }))}
                    onIncreaseQty={(item, maxQty) => setQuantities((prev) => ({ ...prev, [item.id]: Math.min(maxQty, (prev[item.id] ?? 1) + 1) }))}
                    onChangeRowNote={(item, text) => setRowNotes((prev) => ({ ...prev, [item.id]: text }))}
                    onChangeBorrowNote={setBorrowNote}
                    onToggleBorrowConditionAcknowledged={() => setBorrowConditionAcknowledged((prev) => !prev)}
                    onToggleBorrowReportPrintOptIn={() => setBorrowReportPrintOptIn((prev) => !prev)}
                    onPreviewImage={setPreviewImageUri}
                    description="Chọn thêm thiết bị nếu bạn cần mượn trong thời gian sử dụng sân."
                />

                <View style={{ margin: SPACING.md, flexDirection: 'row', gap: SPACING.sm, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.md, padding: SPACING.md }}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: colors.textSecondary, lineHeight: 18 }}>
                        Yêu cầu sẽ được gửi đến admin để xác nhận. Thiết bị mượn thêm sẽ được xử lý cùng lịch đặt của bạn.
                    </Text>
                </View>
            </ScrollView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: SPACING.lg }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: loading ? colors.textDisabled : colors.primary,
                        borderRadius: BORDER_RADIUS.md,
                        paddingVertical: SPACING.lg,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.sm,
                        minHeight: 52,
                    }}
                    onPress={handleBook}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' }}>Gửi yêu cầu đặt sân</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
