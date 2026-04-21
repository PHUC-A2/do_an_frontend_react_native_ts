import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientScreenProps } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import { bookingService } from '@services/booking.service';
import { pitchService } from '@services/pitch.service';
import { useAppDispatch } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';
import { ResBookingDTO } from '@/types/booking.types';
import { ResBookingEquipmentDTO } from '@/types/bookingEquipment.types';
import { ResPitchDTO } from '@/types/pitch.types';
import { ResPitchEquipmentDTO } from '@/types/pitchEquipment.types';
import { formatVND } from '@utils/format/currency';
import { addDays, BookingFormSection, BookingTimelinePanel, buildISO, calcEstimatedPrice, DatePickerModal, durationLabel, durationMinutes, EquipmentBorrowSection, extractTimeHHmm, formatWeekRange, generateDisplaySlots, getWeekStart, normalizeImageUri, PitchSummaryCard, TimePickerModal, toDateParam } from '@components/client/booking/BookingShared';

type Props = ClientScreenProps<'UpdateBooking'>;

function PitchPicker({ visible, colors, items, selectedId, onSelect, onClose }: { visible: boolean; colors: any; items: ResPitchDTO[]; selectedId: number | null; onSelect: (id: number) => void; onClose: () => void; }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><TouchableWithoutFeedback onPress={onClose}><View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}><TouchableWithoutFeedback onPress={() => {}}><View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '72%' }}><View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} /></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}><Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Chọn sân mới</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity></View><ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0, gap: SPACING.sm }}>{items.map((item) => { const selected = item.id === selectedId; return <TouchableOpacity key={item.id} onPress={() => { onSelect(item.id); onClose(); }} style={{ borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}12` : colors.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.md }}><Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{item.name}</Text><Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{item.address}</Text><Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semibold, marginTop: 8 }}>{formatVND(item.pricePerHour)}/giờ</Text></TouchableOpacity>; })}</ScrollView></View></TouchableWithoutFeedback></View></TouchableWithoutFeedback></Modal>;
}

export default function UpdateBookingScreen({ route, navigation }: Props) {
  const { bookingId, pitchId } = route.params;
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [booking, setBooking] = useState<ResBookingDTO | null>(null);
  const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
  const [pitches, setPitches] = useState<ResPitchDTO[]>([]);
  const [pitchEquipments, setPitchEquipments] = useState<ResPitchEquipmentDTO[]>([]);
  const [borrowable, setBorrowable] = useState<ResPitchEquipmentDTO[]>([]);
  const [timelineSlots, setTimelineSlots] = useState<any[]>([]);
  const [timelineSlotMinutes, setTimelineSlotMinutes] = useState<number | undefined>();
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [changePitch, setChangePitch] = useState(false);
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [phone, setPhone] = useState('');
  const [showTimelineDate, setShowTimelineDate] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [showPitchPicker, setShowPitchPicker] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [equipmentTouched, setEquipmentTouched] = useState(false);
  const [rowOn, setRowOn] = useState<Record<number, boolean>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [rowNotes, setRowNotes] = useState<Record<number, string>>({});
  const [borrowNote, setBorrowNote] = useState('');
  const [borrowAck, setBorrowAck] = useState(false);
  const [borrowPrint, setBorrowPrint] = useState(false);
  const [initialQty, setInitialQty] = useState<Record<number, number>>({});
  const effectivePitchId = changePitch && selectedPitchId ? selectedPitchId : (booking?.pitchId ?? pitchId);

  useEffect(() => { setWeekStart(getWeekStart(selectedDate)); }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      bookingService.getBookingById(bookingId),
      bookingService.getBookingEquipments(bookingId).catch(() => ({ data: { data: [] } })),
      pitchService.getPitches({ page: 1, size: 100 }).catch(() => ({ data: { data: { result: [] } } })),
    ]).then(([bookingRes, eqRes, pitchRes]) => {
      if (cancelled) return;
      const b = bookingRes.data.data;
      if (!b) return setBlocked('Không tìm thấy lịch đặt để cập nhật.');
      if (b.status === 'CANCELLED') return setBlocked('Booking đã bị huỷ, không thể cập nhật.');
      if (b.status === 'PAID') return setBlocked('Booking đã thanh toán, không thể cập nhật.');
      setBooking(b); setPitches(pitchRes.data.data?.result ?? []);
      const s = new Date(b.startDateTime); const e = new Date(b.endDateTime);
      setSelectedDate(new Date(s)); setStartDate(s); setEndDate(e); setStartTime(extractTimeHHmm(b.startDateTime)); setEndTime(extractTimeHHmm(b.endDateTime)); setPhone(b.contactPhone ?? '');
      const map: Record<number, number> = {};
      ((eqRes.data.data ?? []) as ResBookingEquipmentDTO[]).filter((item) => !item.deletedByClient && item.status === 'BORROWED').forEach((item) => { map[item.equipmentId] = (map[item.equipmentId] ?? 0) + item.quantity; });
      setInitialQty(map);
    }).catch(() => setBlocked('Không thể tải dữ liệu lịch đặt.')).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  const fetchTimeline = useCallback(async (date: Date) => {
    setLoadingTimeline(true); setTimelineError(null);
    try { const res = await bookingService.getPitchTimeline(effectivePitchId, toDateParam(date)); setTimelineSlots(res.data.data?.slots ?? []); setTimelineSlotMinutes(res.data.data?.slotMinutes ?? 30); }
    catch { setTimelineError('Không thể tải lịch sân. Vui lòng thử lại.'); }
    finally { setLoadingTimeline(false); }
  }, [effectivePitchId]);

  useEffect(() => { if (booking) fetchTimeline(selectedDate); }, [booking, fetchTimeline, selectedDate]);
  useEffect(() => { if (!booking) return; pitchService.getPitchById(effectivePitchId).then((r) => setPitch(r.data.data ?? null)).catch(() => setPitch(null)); }, [booking, effectivePitchId]);
  useEffect(() => { if (!booking) return; setLoadingEquipments(true); Promise.all([bookingService.getPitchEquipments(effectivePitchId).catch(() => ({ data: { data: [] } })), bookingService.getPitchBorrowableEquipments(effectivePitchId).catch(() => ({ data: { data: [] } }))]).then(([a,b]) => { setPitchEquipments(a.data.data ?? []); setBorrowable(b.data.data ?? []); }).finally(() => setLoadingEquipments(false)); }, [booking, effectivePitchId]);
  useEffect(() => { const on: Record<number, boolean> = {}; const qty: Record<number, number> = {}; borrowable.forEach((item) => { const max = Math.min(item.quantity ?? 0, item.equipmentAvailableQuantity ?? item.quantity ?? 0); const init = Math.min(Math.max(initialQty[item.equipmentId] ?? 0, 0), max); on[item.id] = init > 0; qty[item.id] = init; }); setRowOn(on); setQuantities(qty); setRowNotes({}); }, [borrowable, initialQty]);

  const startISO = buildISO(startDate, startTime); const endISO = buildISO(endDate, endTime); const mins = durationMinutes(startISO, endISO);
  const pitchImageUri = useMemo(() => normalizeImageUri(pitch?.pitchUrl ?? pitch?.imageUrl ?? null), [pitch]);
  const dimensionStr = useMemo(() => pitch?.length != null && pitch?.width != null ? `${pitch.length}m × ${pitch.width}m${pitch.height != null ? ` × ${pitch.height}m` : ''}` : 'Chưa cập nhật', [pitch]);
  const areaStr = useMemo(() => pitch?.length != null && pitch?.width != null ? `${Number((pitch.length * pitch.width).toFixed(2)).toLocaleString('vi-VN')} m²` : 'Chưa cập nhật', [pitch]);
  const pitchEquipmentSummary = useMemo(() => pitchEquipments.length ? pitchEquipments.map((item) => `${item.equipmentName} (${item.equipmentMobility === 'MOVABLE' ? 'Mượn được' : 'Cố định'}) x${item.quantity}${item.specification ? ` - ${item.specification}` : ''}`).join('; ') : 'Chưa cập nhật', [pitchEquipments]);
  const estimatedPrice = useMemo(() => pitch ? calcEstimatedPrice(startISO, endISO, pitch) : 0, [pitch, startISO, endISO]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const displaySlots = useMemo(() => generateDisplaySlots(selectedDate, pitch, timelineSlots), [selectedDate, pitch, timelineSlots]);
  const slotRows = useMemo(() => { const visible = toDateParam(selectedDate) === toDateParam(today) ? displaySlots.filter((s) => s.status !== 'PAST') : displaySlots; const rows: (typeof displaySlots[number] | null)[][] = []; for (let i = 0; i < visible.length; i += 2) { const row: (typeof displaySlots[number] | null)[] = [...visible.slice(i, i + 2)]; while (row.length < 2) row.push(null); rows.push(row); } return rows; }, [displaySlots, selectedDate, today]);
  const activePitches = useMemo(() => pitches.filter((item) => item.status === 'ACTIVE'), [pitches]);
  const borrowLines = useMemo(() => borrowable.flatMap((item) => { if (!rowOn[item.id]) return []; const quantity = quantities[item.id] ?? 0; if (quantity <= 0) return []; return [{ equipmentId: item.equipmentId, equipmentMobility: item.equipmentMobility, quantity, borrowConditionNote: rowNotes[item.id]?.trim() || borrowNote.trim() || undefined }]; }), [borrowNote, borrowable, quantities, rowNotes, rowOn]);

  const handleUpdate = useCallback(async () => {
    if (!booking) return;
    if (mins <= 0) return Alert.alert('Lỗi', 'Giờ kết thúc phải sau giờ bắt đầu.');
    if (mins < 30) return Alert.alert('Lỗi', 'Thời lượng đặt sân tối thiểu là 30 phút.');
    if (changePitch && !selectedPitchId) return Alert.alert('Thiếu thông tin', 'Vui lòng chọn sân mới trước khi cập nhật.');
    if (equipmentTouched && borrowLines.length > 0 && !borrowAck) return Alert.alert('Thiếu xác nhận', 'Vui lòng xác nhận đã kiểm tra tình trạng thiết bị trước khi thêm mượn.');
    setSubmitting(true);
    try {
      await bookingService.updateBookingClient(bookingId, { pitchId: changePitch && selectedPitchId ? selectedPitchId : booking.pitchId, startDateTime: startISO, endDateTime: endISO, contactPhone: phone.trim() || undefined });
      if (equipmentTouched && borrowLines.length) await Promise.all(borrowLines.map((line) => bookingService.borrowEquipment({ bookingId, equipmentId: line.equipmentId, quantity: line.quantity, equipmentMobility: line.equipmentMobility, borrowConditionNote: line.borrowConditionNote, borrowConditionAcknowledged: true, borrowReportPrintOptIn: borrowPrint }).catch(() => null)));
      dispatch(fetchMyBookings(undefined));
      Alert.alert('Cập nhật thành công', 'Lịch đặt đã được cập nhật.', [{ text: 'Xem chi tiết', onPress: () => navigation.replace('BookingDetail', { bookingId }) }]);
    } catch (err: any) { Alert.alert('Cập nhật thất bại', err?.response?.data?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.'); }
    finally { setSubmitting(false); }
  }, [booking, bookingId, borrowAck, borrowLines, borrowPrint, changePitch, dispatch, equipmentTouched, mins, navigation, phone, selectedPitchId, startISO, endISO]);

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }} edges={['bottom','left','right']}><ActivityIndicator size="large" color={colors.primary} /><Text style={{ marginTop: SPACING.md, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Đang tải dữ liệu lịch đặt...</Text></SafeAreaView>;
  if (blocked || !booking) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }} edges={['bottom','left','right']}><Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, textAlign: 'center' }}>Không thể cập nhật lịch đặt</Text><Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: SPACING.sm, textAlign: 'center' }}>{blocked ?? 'Booking không hợp lệ.'}</Text></SafeAreaView>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom','left','right']}>
    <DatePickerModal visible={showTimelineDate} value={selectedDate} onConfirm={setSelectedDate} onClose={() => setShowTimelineDate(false)} colors={colors} />
    <DatePickerModal visible={showStartDate} value={startDate} onConfirm={(d) => { setStartDate(d); if (d > endDate) setEndDate(d); }} onClose={() => setShowStartDate(false)} colors={colors} />
    <DatePickerModal visible={showEndDate} value={endDate} onConfirm={setEndDate} onClose={() => setShowEndDate(false)} colors={colors} />
    <TimePickerModal visible={showStartTime} value={startTime} onConfirm={setStartTime} onClose={() => setShowStartTime(false)} colors={colors} />
    <TimePickerModal visible={showEndTime} value={endTime} onConfirm={setEndTime} onClose={() => setShowEndTime(false)} colors={colors} />
    <PitchPicker visible={showPitchPicker} colors={colors} items={activePitches} selectedId={selectedPitchId} onSelect={setSelectedPitchId} onClose={() => setShowPitchPicker(false)} />
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}><TouchableWithoutFeedback onPress={() => setPreview(null)}><View style={{ flex: 1, backgroundColor: '#000000DD', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>{preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: '70%' }} resizeMode="contain" /> : null}</View></TouchableWithoutFeedback></Modal>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loadingTimeline} onRefresh={() => fetchTimeline(selectedDate)} tintColor={colors.primary} colors={[colors.primary]} />}>
      <BookingTimelinePanel colors={colors} selectedDate={selectedDate} today={today} weekDays={weekDays} weekRangeLabel={formatWeekRange(weekStart)} loadingTimeline={loadingTimeline} timelineError={timelineError} slotRows={slotRows} onOpenDatePicker={() => setShowTimelineDate(true)} onSelectDate={setSelectedDate} onRetry={() => fetchTimeline(selectedDate)} />
      <PitchSummaryCard colors={colors} pitch={pitch} pitchImageUri={pitchImageUri} timelineSlotMinutes={timelineSlotMinutes} dimensionStr={dimensionStr} areaStr={areaStr} pitchEquipmentSummary={pitchEquipmentSummary} onPreviewImage={setPreview} loading={!pitch} />
      <BookingFormSection
        colors={colors}
        title="Cập nhật thông tin"
        startDate={startDate}
        endDate={endDate}
        startTime={startTime}
        endTime={endTime}
        onPressStartDate={() => setShowStartDate(true)}
        onPressEndDate={() => setShowEndDate(true)}
        onPressStartTime={() => setShowStartTime(true)}
        onPressEndTime={() => setShowEndTime(true)}
        durationText={mins > 0 ? durationLabel(mins) : 'Không hợp lệ'}
        durationError={mins <= 0}
        estimatedPriceText={mins > 0 ? formatVND(estimatedPrice) : '--'}
        phone={phone}
        onChangePhone={setPhone}
        topContent={<>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md }}><View style={{ flex: 1 }}><Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>Đổi sân thi đấu</Text><Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }}>Bật nếu muốn chuyển lịch đặt sang sân khác.</Text></View><TouchableOpacity onPress={() => { setChangePitch((p) => !p); if (changePitch) setSelectedPitchId(null); }}><Text style={{ color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>{changePitch ? 'Tắt' : 'Bật'}</Text></TouchableOpacity></View>
          {changePitch ? <TouchableOpacity onPress={() => setShowPitchPicker(true)} style={{ backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}><Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Sân mới</Text><Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: selectedPitchId ? colors.textPrimary : colors.textSecondary }}>{activePitches.find((item) => item.id === selectedPitchId)?.name ?? 'Chọn sân'}</Text></TouchableOpacity> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}><Ionicons name="receipt-outline" size={16} color={colors.textHint} /><Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>Booking <Text style={{ fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>#{booking.id}</Text></Text></View>
        </>}
      />
      <EquipmentBorrowSection colors={colors} loading={loadingEquipments} borrowableEquipments={borrowable} rowOn={rowOn} quantities={quantities} rowNotes={rowNotes} borrowNote={borrowNote} borrowConditionAcknowledged={borrowAck} borrowReportPrintOptIn={borrowPrint} onToggleRow={(item, value, maxQty) => { setEquipmentTouched(true); setRowOn((p) => ({ ...p, [item.id]: value })); setQuantities((p) => ({ ...p, [item.id]: value ? Math.max(1, Math.min(p[item.id] || 1, maxQty)) : 0 })); }} onDecreaseQty={(item) => { setEquipmentTouched(true); setQuantities((p) => ({ ...p, [item.id]: Math.max(1, (p[item.id] ?? 1) - 1) })); }} onIncreaseQty={(item, maxQty) => { setEquipmentTouched(true); setQuantities((p) => ({ ...p, [item.id]: Math.min(maxQty, (p[item.id] ?? 1) + 1) })); }} onChangeRowNote={(item, text) => { setEquipmentTouched(true); setRowNotes((p) => ({ ...p, [item.id]: text })); }} onChangeBorrowNote={(text) => { setEquipmentTouched(true); setBorrowNote(text); }} onToggleBorrowConditionAcknowledged={() => { setEquipmentTouched(true); setBorrowAck((p) => !p); }} onToggleBorrowReportPrintOptIn={() => { setEquipmentTouched(true); setBorrowPrint((p) => !p); }} onPreviewImage={setPreview} description="Chọn thêm thiết bị nếu bạn cần mượn trong thời gian sử dụng sân." />
    </ScrollView>
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: SPACING.lg }}><TouchableOpacity style={{ backgroundColor: mins >= 30 && !submitting ? colors.primary : colors.textDisabled, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 52 }} onPress={handleUpdate} disabled={mins < 30 || submitting}>{submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' }}>Cập nhật lịch đặt</Text></>}</TouchableOpacity></View>
  </SafeAreaView>;
}
