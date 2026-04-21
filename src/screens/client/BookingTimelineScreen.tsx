import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
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
import { ResPitchDTO } from '@/types/pitch.types';
import { ResPitchEquipmentDTO } from '@/types/pitchEquipment.types';
import { formatVND } from '@utils/format/currency';
import {
    addDays,
    BookingFormSection,
    BookingTimelinePanel,
    buildISO,
    calcEstimatedPrice,
    DatePickerModal,
    durationLabel,
    durationMinutes,
    EquipmentBorrowSection,
    formatWeekRange,
    generateDisplaySlots,
    getWeekStart,
    normalizeImageUri,
    PitchSummaryCard,
    TimePickerModal,
    toDateParam,
} from '@components/client/booking/BookingShared';

type Props = ClientScreenProps<'BookingTimeline'>;

function getDefaultBookingTimes(): { startTime: string; endTime: string } {
    const now = new Date();
    const totalMins = now.getHours() * 60 + now.getMinutes();
    const startTotal = Math.ceil((totalMins + 1) / 5) * 5;
    const endTotal = startTotal + 30;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        startTime: `${pad(Math.floor(startTotal / 60) % 24)}:${pad(startTotal % 60)}`,
        endTime: `${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`,
    };
}

export default function BookingTimelineScreen({ route, navigation }: Props) {
    const { pitchId } = route.params;
    const { colors } = useTheme();
    const dispatch = useAppDispatch();

    const defaults = useMemo(() => getDefaultBookingTimes(), []);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
    const [pitchEquipments, setPitchEquipments] = useState<ResPitchEquipmentDTO[]>([]);
    const [borrowableEquipments, setBorrowableEquipments] = useState<ResPitchEquipmentDTO[]>([]);
    const [timelineSlots, setTimelineSlots] = useState<any[]>([]);
    const [timelineSlotMinutes, setTimelineSlotMinutes] = useState<number | undefined>(undefined);
    const [loadingPitch, setLoadingPitch] = useState(true);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState(defaults.startTime);
    const [endTime, setEndTime] = useState(defaults.endTime);
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [showStartTime, setShowStartTime] = useState(false);
    const [showEndTime, setShowEndTime] = useState(false);
    const [showTimelineDate, setShowTimelineDate] = useState(false);
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
    const [rowOn, setRowOn] = useState<Record<number, boolean>>({});
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [rowNotes, setRowNotes] = useState<Record<number, string>>({});
    const [borrowNote, setBorrowNote] = useState('');
    const [borrowConditionAcknowledged, setBorrowConditionAcknowledged] = useState(false);
    const [borrowReportPrintOptIn, setBorrowReportPrintOptIn] = useState(false);

    useEffect(() => {
        setWeekStart(getWeekStart(selectedDate));
    }, [selectedDate]);

    useEffect(() => {
        let cancelled = false;
        setLoadingPitch(true);
        Promise.all([
            pitchService.getPitchById(pitchId).catch(() => ({ data: { data: null } })),
            bookingService.getPitchEquipments(pitchId).catch(() => ({ data: { data: [] } })),
            bookingService.getPitchBorrowableEquipments(pitchId).catch(() => ({ data: { data: [] } })),
        ])
            .then(([pitchRes, equipmentRes, borrowableRes]) => {
                if (cancelled) return;
                setPitch(pitchRes.data.data ?? null);
                setPitchEquipments(equipmentRes.data.data ?? []);
                setBorrowableEquipments(borrowableRes.data.data ?? []);
            })
            .finally(() => {
                if (!cancelled) setLoadingPitch(false);
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

    const fetchTimeline = useCallback(async (date: Date) => {
        setLoadingTimeline(true);
        setTimelineError(null);
        try {
            const res = await bookingService.getPitchTimeline(pitchId, toDateParam(date));
            setTimelineSlots(res.data.data?.slots ?? []);
            setTimelineSlotMinutes(res.data.data?.slotMinutes ?? 30);
        } catch {
            setTimelineError('Không thể tải lịch sân. Vui lòng thử lại.');
        } finally {
            setLoadingTimeline(false);
        }
    }, [pitchId]);

    useEffect(() => {
        fetchTimeline(selectedDate);
    }, [fetchTimeline, selectedDate]);

    const startISO = buildISO(startDate, startTime);
    const endISO = buildISO(endDate, endTime);
    const durMins = durationMinutes(startISO, endISO);

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
        () => (pitch && durMins > 0 ? calcEstimatedPrice(startISO, endISO, pitch) : 0),
        [durMins, endISO, pitch, startISO],
    );
    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart],
    );
    const displaySlots = useMemo(
        () => generateDisplaySlots(selectedDate, pitch, timelineSlots),
        [pitch, selectedDate, timelineSlots],
    );
    const slotRows = useMemo(() => {
        const visible = toDateParam(selectedDate) === toDateParam(today)
            ? displaySlots.filter((slot) => slot.status !== 'PAST')
            : displaySlots;
        const rows: (typeof displaySlots[number] | null)[][] = [];
        for (let i = 0; i < visible.length; i += 2) {
            const row: (typeof displaySlots[number] | null)[] = [...visible.slice(i, i + 2)];
            while (row.length < 2) row.push(null);
            rows.push(row);
        }
        return rows;
    }, [displaySlots, selectedDate, today]);

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
        if (durMins <= 0) {
            Alert.alert('Lỗi', 'Giờ kết thúc phải sau giờ bắt đầu.');
            return;
        }
        if (durMins < 30) {
            Alert.alert('Lỗi', 'Thời lượng đặt sân tối thiểu là 30 phút.');
            return;
        }
        if (borrowLines.length > 0 && !borrowConditionAcknowledged) {
            Alert.alert('Thiếu xác nhận', 'Vui lòng xác nhận đã kiểm tra tình trạng thiết bị trước khi gửi yêu cầu đặt sân.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await bookingService.createBooking({
                pitchId,
                startDateTime: startISO,
                endDateTime: endISO,
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
            dispatch(fetchMyBookings(undefined));
            Alert.alert('Đặt sân thành công!', 'Yêu cầu đặt sân đã được gửi. Chờ admin xác nhận.', [
                {
                    text: 'Xem đặt sân',
                    onPress: () => navigation.replace('BookingDetail', { bookingId: booking.id }),
                },
            ]);
        } catch (err: any) {
            Alert.alert('Đặt sân thất bại', err?.response?.data?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    }, [borrowConditionAcknowledged, borrowLines, borrowReportPrintOptIn, dispatch, durMins, endISO, navigation, phone, pitchId, startISO]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            <DatePickerModal visible={showStartDate} value={startDate} onConfirm={(d) => { setStartDate(d); if (d > endDate) setEndDate(d); }} onClose={() => setShowStartDate(false)} colors={colors} />
            <DatePickerModal visible={showEndDate} value={endDate} onConfirm={setEndDate} onClose={() => setShowEndDate(false)} colors={colors} />
            <DatePickerModal visible={showTimelineDate} value={selectedDate} onConfirm={setSelectedDate} onClose={() => setShowTimelineDate(false)} colors={colors} />
            <TimePickerModal visible={showStartTime} value={startTime} onConfirm={setStartTime} onClose={() => setShowStartTime(false)} colors={colors} />
            <TimePickerModal visible={showEndTime} value={endTime} onConfirm={setEndTime} onClose={() => setShowEndTime(false)} colors={colors} />

            <Modal visible={!!previewImageUri} transparent animationType="fade" onRequestClose={() => setPreviewImageUri(null)}>
                <TouchableWithoutFeedback onPress={() => setPreviewImageUri(null)}>
                    <View style={{ flex: 1, backgroundColor: '#000000DD', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
                        {previewImageUri ? <Image source={{ uri: previewImageUri }} style={{ width: '100%', height: '70%' }} resizeMode="contain" /> : null}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 180 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loadingTimeline} onRefresh={() => fetchTimeline(selectedDate)} tintColor={colors.primary} colors={[colors.primary]} />}
            >
                <BookingTimelinePanel
                    colors={colors}
                    selectedDate={selectedDate}
                    today={today}
                    weekDays={weekDays}
                    weekRangeLabel={formatWeekRange(weekStart)}
                    loadingTimeline={loadingTimeline}
                    timelineError={timelineError}
                    slotRows={slotRows}
                    onOpenDatePicker={() => setShowTimelineDate(true)}
                    onSelectDate={setSelectedDate}
                    onRetry={() => fetchTimeline(selectedDate)}
                />

                <PitchSummaryCard
                    colors={colors}
                    pitch={pitch}
                    pitchImageUri={pitchImageUri}
                    timelineSlotMinutes={timelineSlotMinutes}
                    dimensionStr={dimensionStr}
                    areaStr={areaStr}
                    pitchEquipmentSummary={pitchEquipmentSummary}
                    onPreviewImage={setPreviewImageUri}
                    loading={loadingPitch}
                />

                <BookingFormSection
                    colors={colors}
                    title="Thông tin đặt sân"
                    startDate={startDate}
                    endDate={endDate}
                    startTime={startTime}
                    endTime={endTime}
                    onPressStartDate={() => setShowStartDate(true)}
                    onPressEndDate={() => setShowEndDate(true)}
                    onPressStartTime={() => setShowStartTime(true)}
                    onPressEndTime={() => setShowEndTime(true)}
                    durationText={durMins > 0 ? durationLabel(durMins) : 'Không hợp lệ'}
                    durationError={durMins <= 0}
                    dimensionStr={pitch ? dimensionStr : undefined}
                    areaStr={pitch ? areaStr : undefined}
                    estimatedPriceText={durMins > 0 ? formatVND(estimatedPrice) : '--'}
                    phone={phone}
                    onChangePhone={setPhone}
                    phoneHint="Nếu không nhập, hệ thống sẽ dùng số điện thoại từ hồ sơ của bạn."
                />

                <EquipmentBorrowSection
                    colors={colors}
                    loading={loadingPitch}
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

                <View style={{ height: SPACING.lg }} />
            </ScrollView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: SPACING.lg }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: durMins >= 30 && !submitting ? colors.primary : colors.textDisabled,
                        borderRadius: BORDER_RADIUS.md,
                        paddingVertical: SPACING.lg,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.sm,
                        minHeight: 52,
                    }}
                    onPress={handleBook}
                    disabled={durMins < 30 || submitting}
                    activeOpacity={0.85}
                >
                    {submitting ? (
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
