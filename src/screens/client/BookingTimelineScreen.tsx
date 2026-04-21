import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ActivityIndicator,
    RefreshControl,
    Image,
    TextInput,
    Alert,
    Modal,
    FlatList,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientScreenProps } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import { bookingService } from '@services/booking.service';
import { pitchService } from '@services/pitch.service';
import { ResPitchTimelineDTO, ResPitchTimelineSlotDTO, SlotStatus } from '@/types/booking.types';
import { ResPitchDTO } from '@/types/pitch.types';
import { formatVND } from '@utils/format/currency';
import { PITCH_TYPE_LABEL, PITCH_STATUS_LABEL, IMAGE_BASE_URL } from '@utils/constants';

type Props = ClientScreenProps<'BookingTimeline'>;

const VI_WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_WEEKDAY_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const SLOT_COLORS: Record<SlotStatus, { bg: string; border: string; text: string; label: string }> = {
    FREE: { bg: '#0A2A14', border: '#16A34A', text: '#4ADE80', label: 'TRỐNG' },
    PAST: { bg: '#0D1117', border: '#1E293B', text: '#4B5563', label: 'ĐÃ QUA' },
    PENDING: { bg: '#1C1200', border: '#92400E', text: '#FCD34D', label: 'CHỜ DUYỆT' },
    BOOKED: { bg: '#1A0000', border: '#991B1B', text: '#F87171', label: 'ĐÃ ĐẶT' },
    BOOKED_BY_OTHER: { bg: '#1A0000', border: '#991B1B', text: '#F87171', label: 'ĐÃ ĐẶT' },
};
const SLOT_COLOR_UNKNOWN = { bg: '#1E293B', border: '#334155', text: '#334155', label: '—' };

// ----- Pure helpers ----------------------------------------------------------

function pad(n: number): string { return String(n).padStart(2, '0'); }

function addDays(date: Date, n: number): Date {
    const d = new Date(date); d.setDate(d.getDate() + n); return d;
}

function toDateParam(date: Date): string {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
}

function formatWeekRange(weekStart: Date): string {
    const end = addDays(weekStart, 6);
    return `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
}

function formatDateVN(date: Date): string {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateHeading(date: Date): string {
    return `${VI_WEEKDAY_FULL[date.getDay()].toUpperCase()}, ${formatDateVN(date)}`;
}

function localTimeToMinutes(t: string | null | undefined): number {
    if (!t) return 0;
    const parts = t.split(':');
    return parseInt(parts[0] ?? '0') * 60 + parseInt(parts[1] ?? '0');
}

function buildISO(date: Date, timeStr: string): string {
    return `${toDateParam(date)}T${timeStr}:00`;
}

function getDisplaySlotStatus(
    date: Date,
    minuteOfDay: number,
    apiSlots: ResPitchTimelineSlotDTO[],
): SlotStatus | null {
    const h = Math.floor(minuteOfDay / 60);
    const m = minuteOfDay % 60;
    const iso = `${toDateParam(date)}T${pad(h)}:${pad(m)}:00`;
    for (const slot of apiSlots) {
        if (iso >= slot.start && iso < slot.end) return slot.status;
    }
    return null;
}

interface DisplaySlot {
    minuteOfDay: number;
    timeStr: string;
    status: SlotStatus | null;
}

function generateDisplaySlots(
    date: Date,
    pitch: ResPitchDTO | null,
    apiSlots: ResPitchTimelineSlotDTO[],
): DisplaySlot[] {
    if (!pitch) return [];
    const start = pitch.open24h ? 0 : localTimeToMinutes(pitch.openTime);
    const rawEnd = pitch.open24h ? 24 * 60 : localTimeToMinutes(pitch.closeTime);
    const end = rawEnd === 0 ? 24 * 60 : rawEnd;
    const result: DisplaySlot[] = [];
    for (let m = start; m < end; m += 5) {
        result.push({
            minuteOfDay: m,
            timeStr: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
            status: getDisplaySlotStatus(date, m, apiSlots),
        });
    }
    return result;
}

function durationMinutes(startISO: string, endISO: string): number {
    return (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000;
}

function durationLabel(mins: number): string {
    if (mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
}

function calcEstimatedPrice(startISO: string, endISO: string, pitch: ResPitchDTO): number {
    const durMins = durationMinutes(startISO, endISO);
    if (durMins <= 0) return 0;
    if (!pitch.hourlyPrices || pitch.hourlyPrices.length === 0) {
        return (durMins / 60) * (pitch.pricePerHour ?? 0);
    }
    const startMinOfDay = localTimeToMinutes(startISO.split('T')[1]);
    let total = 0;
    for (let i = 0; i < durMins; i++) {
        const tod = (startMinOfDay + i) % (24 * 60);
        let rate = pitch.pricePerHour ?? 0;
        for (const hp of pitch.hourlyPrices) {
            const hpStart = localTimeToMinutes(hp.startTime);
            const hpEnd = localTimeToMinutes(hp.endTime);
            if (tod >= hpStart && tod < hpEnd) { rate = hp.pricePerHour; break; }
        }
        total += rate / 60;
    }
    return Math.round(total);
}

const TIME_OPTIONS: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) opts.push(`${pad(h)}:${pad(m)}`);
    return opts;
})();

// ----- Drum-roll date picker column -----------------------------------------

const DR_H = 40;  // height per item
const DR_ROWS = 3; // visible rows (odd → middle is selected)
const DR_MONTH_LABELS = ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'];

function DrumCol({ items, labels, selected, onSettle, flex, colors }: {
    items: number[];
    labels?: string[];
    selected: number;
    onSettle: (value: number) => void;
    flex?: number;
    colors: any;
}) {
    const listRef = useRef<ScrollView>(null);
    const paddedItems: (number | null)[] = [null, ...items, null];

    // current index in the real items array
    const selIdx = items.indexOf(selected);

    // Scroll to selected when value changes from outside
    useEffect(() => {
        if (selIdx >= 0) {
            const t = setTimeout(() => {
                listRef.current?.scrollTo({ y: selIdx * DR_H, animated: true });
            }, 60);
            return () => clearTimeout(t);
        }
    }, [selected]);

    // Initial scroll without animation
    useEffect(() => {
        if (selIdx >= 0) {
            const t = setTimeout(() => {
                listRef.current?.scrollTo({ y: selIdx * DR_H, animated: false });
            }, 120);
            return () => clearTimeout(t);
        }
    }, []);

    return (
        <View style={{ flex: flex ?? 1, height: DR_H * DR_ROWS, overflow: 'hidden' }}>
            {/* Selection highlight behind the center row */}
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute', top: DR_H, left: 2, right: 2, height: DR_H,
                    borderRadius: 8,
                    backgroundColor: colors.primary + '1A',
                    borderTopWidth: 1, borderBottomWidth: 1,
                    borderColor: colors.primary + '55',
                    zIndex: 1,
                }}
            />
            <ScrollView
                ref={listRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={DR_H}
                decelerationRate="fast"
                style={{ height: DR_H * DR_ROWS }}
                scrollEventThrottle={16}
                onMomentumScrollEnd={e => {
                    const newIdx = Math.round(e.nativeEvent.contentOffset.y / DR_H);
                    if (newIdx >= 0 && newIdx < items.length) {
                        onSettle(items[newIdx]);
                    }
                }}
            >
                {paddedItems.map((_, index) => {
                    const realIdx = index - 1;
                    if (realIdx < 0 || realIdx >= items.length) {
                        return <View key={index} style={{ height: DR_H }} />;
                    }
                    const value = items[realIdx];
                    const label = labels ? labels[realIdx] : String(value).padStart(2, '0');
                    const dist = Math.abs(realIdx - selIdx);
                    const isSelected = dist === 0;
                    return (
                        <View key={index} style={{ height: DR_H, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{
                                fontSize: isSelected ? 16 : 13,
                                fontWeight: isSelected ? '700' : '400',
                                color: isSelected ? colors.primary : colors.textSecondary,
                                opacity: dist === 0 ? 1 : dist === 1 ? 0.55 : 0.2,
                            }}>
                                {label}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

// ----- Time Picker Modal -----------------------------------------------------

const PICKER_ITEM_H = 50;

function TimePickerModal({
    visible, value, onConfirm, onClose, colors,
}: {
    visible: boolean;
    value: string;
    onConfirm: (v: string) => void;
    onClose: () => void;
    colors: any;
}) {
    const listRef = useRef<FlatList>(null);
    const [tempVal, setTempVal] = useState(value);

    useEffect(() => {
        if (!visible) return;
        setTempVal(value);
        const idx = TIME_OPTIONS.indexOf(value);
        if (idx < 0) return;
        setTimeout(() => {
            listRef.current?.scrollToIndex({ index: Math.max(0, idx - 3), animated: false });
        }, 150);
    }, [visible, value]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: '#00000088' }}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        }}>
                            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>Đóng</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>
                                    Chọn giờ
                                </Text>
                                <TouchableOpacity onPress={() => { onConfirm(tempVal); onClose(); }}>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.bold }}>Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                ref={listRef}
                                data={TIME_OPTIONS}
                                style={{ height: 300 }}
                                keyExtractor={t => t}
                                getItemLayout={(_, i) => ({ length: PICKER_ITEM_H, offset: PICKER_ITEM_H * i, index: i })}
                                showsVerticalScrollIndicator={false}
                                onScrollToIndexFailed={info => {
                                    setTimeout(() => {
                                        listRef.current?.scrollToIndex({ index: info.index, animated: false });
                                    }, 200);
                                }}
                                renderItem={({ item }) => {
                                    const sel = item === tempVal;
                                    return (
                                        <TouchableOpacity
                                            style={{
                                                height: PICKER_ITEM_H,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                backgroundColor: sel ? colors.primary + '28' : 'transparent',
                                            }}
                                            onPress={() => setTempVal(item)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{
                                                fontSize: sel ? FONT_SIZE.xxl : FONT_SIZE.xl,
                                                fontWeight: sel ? FONT_WEIGHT.bold : FONT_WEIGHT.regular,
                                                color: sel ? colors.primary : colors.textSecondary,
                                            }}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <View style={{ height: Platform.OS === 'ios' ? 32 : 16 }} />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ----- Date Picker Modal -----------------------------------------------------

function DatePickerModal({
    visible, value, onConfirm, onClose, colors,
}: {
    visible: boolean;
    value: Date;
    onConfirm: (d: Date) => void;
    onClose: () => void;
    colors: any;
}) {
    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const [viewYear, setViewYear] = useState(value.getFullYear());
    const [viewMonth, setViewMonth] = useState(value.getMonth());

    useEffect(() => {
        if (visible) { setViewYear(value.getFullYear()); setViewMonth(value.getMonth()); }
    }, [visible, value]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    const cells: (number | null)[] = [
        ...Array.from({ length: offset }, () => null as null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', paddingHorizontal: SPACING.lg }}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                                <TouchableOpacity onPress={prevMonth} style={{ padding: SPACING.sm }}>
                                    <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>
                                    {`Tháng ${pad(viewMonth + 1)}/${viewYear}`}
                                </Text>
                                <TouchableOpacity onPress={nextMonth} style={{ padding: SPACING.sm }}>
                                    <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', marginBottom: SPACING.sm }}>
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                    <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint }}>
                                        {d}
                                    </Text>
                                ))}
                            </View>
                            {rows.map((row, ri) => (
                                <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                                    {row.map((day, di) => {
                                        if (!day) return <View key={di} style={{ flex: 1, height: 38 }} />;
                                        const cellDate = new Date(viewYear, viewMonth, day);
                                        cellDate.setHours(0, 0, 0, 0);
                                        const isPast = cellDate < today;
                                        const isSelected = toDateParam(cellDate) === toDateParam(value);
                                        const isToday = toDateParam(cellDate) === toDateParam(today);
                                        return (
                                            <TouchableOpacity
                                                key={di}
                                                disabled={isPast}
                                                onPress={() => { onConfirm(cellDate); onClose(); }}
                                                style={{
                                                    flex: 1, height: 38,
                                                    justifyContent: 'center', alignItems: 'center',
                                                    borderRadius: BORDER_RADIUS.full,
                                                    backgroundColor: isSelected ? colors.primary : isToday ? colors.primaryLight : 'transparent',
                                                    opacity: isPast ? 0.3 : 1,
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={{
                                                    fontSize: FONT_SIZE.sm,
                                                    fontWeight: isSelected || isToday ? FONT_WEIGHT.bold : FONT_WEIGHT.regular,
                                                    color: isSelected ? '#fff' : isToday ? colors.primary : colors.textPrimary,
                                                }}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingTop: SPACING.md }}>
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Đóng</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ----- Main Screen -----------------------------------------------------------

export default function BookingTimelineScreen({ route, navigation }: Props) {
    const { pitchId } = route.params;
    const { colors } = useTheme();

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
    const [timeline, setTimeline] = useState<ResPitchTimelineDTO | null>(null);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);

    const [startDate, setStartDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState('07:00');
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState('08:00');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [showStartTime, setShowStartTime] = useState(false);
    const [showEndTime, setShowEndTime] = useState(false);
    const [showTimelineDate, setShowTimelineDate] = useState(false);

    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

    // Keep weekStart in sync with selectedDate (for the week tabs row)
    useEffect(() => {
        setWeekStart(getWeekStart(selectedDate));
    }, [selectedDate]);

    // Drum picker data
    const selDay = selectedDate.getDate();
    const selMonth = selectedDate.getMonth() + 1; // 1-12
    const selYear = selectedDate.getFullYear();
    const daysInSelMonth = new Date(selYear, selMonth, 0).getDate();
    const drumDays = useMemo(() => Array.from({ length: daysInSelMonth }, (_, i) => i + 1), [daysInSelMonth]);
    const drumMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const thisYear = today.getFullYear();
    const drumYears = useMemo(() => Array.from({ length: 6 }, (_, i) => thisYear + i), [thisYear]);
    const drumYearLabels = useMemo(() => drumYears.map(String), [drumYears]);

    const handleDrumDay = useCallback((day: number) => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setDate(day);
            return d;
        });
    }, []);

    const handleDrumMonth = useCallback((month: number) => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            const maxDay = new Date(d.getFullYear(), month, 0).getDate();
            d.setDate(Math.min(d.getDate(), maxDay));
            d.setMonth(month - 1);
            return d;
        });
    }, []);

    const handleDrumYear = useCallback((year: number) => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            const maxDay = new Date(year, d.getMonth() + 1, 0).getDate();
            d.setDate(Math.min(d.getDate(), maxDay));
            d.setFullYear(year);
            return d;
        });
    }, []);

    useEffect(() => {
        pitchService.getPitchById(pitchId).then(r => setPitch(r.data.data ?? null)).catch(() => { });
    }, [pitchId]);

    const fetchTimeline = useCallback(async (date: Date) => {
        setLoadingTimeline(true);
        setTimelineError(null);
        try {
            const res = await bookingService.getPitchTimeline(pitchId, toDateParam(date));
            setTimeline(res.data.data ?? null);
        } catch {
            setTimelineError('Không thể tải lịch sân. Vui lòng thử lại.');
        } finally {
            setLoadingTimeline(false);
        }
    }, [pitchId]);

    useEffect(() => { fetchTimeline(selectedDate); }, [selectedDate]);

    const displaySlots = useMemo(
        () => generateDisplaySlots(selectedDate, pitch, timeline?.slots ?? []),
        [selectedDate, pitch, timeline],
    );

    const slotRows = useMemo<(DisplaySlot | null)[][]>(() => {
        // Ẩn slot "Đã qua" chỉ khi đang xem ngày hôm nay
        const isViewingToday = toDateParam(selectedDate) === toDateParam(today);
        const visible = isViewingToday
            ? displaySlots.filter(s => s.status !== 'PAST')
            : displaySlots;

        const rows: (DisplaySlot | null)[][] = [];
        for (let i = 0; i < visible.length; i += 2) {
            const row: (DisplaySlot | null)[] = [...visible.slice(i, i + 2)];
            while (row.length < 2) row.push(null);
            rows.push(row);
        }
        return rows;
    }, [displaySlots, selectedDate, today]);

    // Pulse animation for FREE slots
    const pulseAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    // Fade-in animation for slot grid when data loads
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!loadingTimeline && slotRows.length > 0) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
        }
    }, [loadingTimeline, slotRows.length]);

    const startISO = buildISO(startDate, startTime);
    const endISO = buildISO(endDate, endTime);
    const durMins = durationMinutes(startISO, endISO);

    const estimatedPrice = useMemo(
        () => (pitch && durMins > 0) ? calcEstimatedPrice(startISO, endISO, pitch) : 0,
        [startISO, endISO, pitch, durMins],
    );

    const pitchImage = pitch?.pitchUrl ?? pitch?.imageUrl;
    const dimensionStr = (pitch?.length && pitch?.width)
        ? `${pitch.length}m × ${pitch.width}m${pitch.height ? ` × ${pitch.height}m` : ''}`
        : 'Chưa cập nhật';
    const areaStr = (pitch?.length && pitch?.width)
        ? `${(pitch.length * pitch.width).toLocaleString('vi-VN')} m²`
        : 'Chưa cập nhật';

    const handleBook = async () => {
        if (durMins <= 0) {
            Alert.alert('Lỗi', 'Giờ kết thúc phải sau giờ bắt đầu.');
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
            Alert.alert(
                'Đặt sân thành công!',
                'Yêu cầu đặt sân đã được gửi. Chờ admin xác nhận.',
                [{ text: 'Xem đặt sân', onPress: () => navigation.replace('BookingDetail', { bookingId: booking.id }) }],
            );
        } catch (err: any) {
            Alert.alert('Đặt sân thất bại', err?.response?.data?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderSlotCell = (slot: DisplaySlot | null, key: string) => {
        if (!slot) return <View key={key} style={{ flex: 1, marginBottom: 4 }} />;
        const cfg = slot.status ? SLOT_COLORS[slot.status] : SLOT_COLOR_UNKNOWN;
        const endMins = slot.minuteOfDay + 5;
        const endStr = `${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`;
        const isFree = slot.status === 'FREE';
        // Pulse only the label text opacity (not the whole card) to avoid dark feel
        const labelOpacity = isFree
            ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
            : 1;
        return (
            <View
                key={key}
                style={{
                    flex: 1, marginBottom: 4,
                    backgroundColor: cfg.bg,
                    borderRadius: BORDER_RADIUS.sm,
                    borderWidth: 1,
                    borderColor: cfg.border,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Background decorative stripes */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', opacity: 0.07 }}>
                    {[0, 1, 2, 3, 4, 5].map(idx => (
                        <View key={idx} style={{
                            position: 'absolute',
                            width: 1.5,
                            height: 120,
                            backgroundColor: cfg.text,
                            top: -30,
                            left: idx * 18 - 4,
                            transform: [{ rotate: '30deg' }],
                        }} />
                    ))}
                </View>
                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#E2E8F0', letterSpacing: 0.3, textAlign: 'center' }}>
                    {slot.timeStr} – {endStr}
                </Text>
                <Animated.Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: cfg.text, marginTop: 3, letterSpacing: 0.8, textAlign: 'center', opacity: labelOpacity }}>
                    {cfg.label}
                </Animated.Text>
            </View>
        );
    };

    const DateBtn = ({ label, value: val, onPress }: { label: string; value: Date; onPress: () => void }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{ flex: 1, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}
            activeOpacity={0.8}
        >
            <Text style={{ fontSize: 10, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                    {formatDateVN(val)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const TimeBtn = ({ label, value: val, onPress }: { label: string; value: string; onPress: () => void }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{ flex: 1, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}
            activeOpacity={0.8}
        >
            <Text style={{ fontSize: 10, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{val}</Text>
            </View>
        </TouchableOpacity>
    );

    const PitchInfoRow = ({ emoji, label, value }: { emoji: string; label: string; value: string }) => (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Text style={{ width: 22, fontSize: FONT_SIZE.sm }}>{emoji}</Text>
            <Text style={{ width: 110, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>{label}</Text>
            <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, textAlign: 'right' }}>{value}</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>

            <DatePickerModal visible={showStartDate} value={startDate} onConfirm={d => { setStartDate(d); if (d > endDate) setEndDate(d); }} onClose={() => setShowStartDate(false)} colors={colors} />
            <DatePickerModal visible={showEndDate} value={endDate} onConfirm={setEndDate} onClose={() => setShowEndDate(false)} colors={colors} />
            <DatePickerModal visible={showTimelineDate} value={selectedDate} onConfirm={setSelectedDate} onClose={() => setShowTimelineDate(false)} colors={colors} />
            <TimePickerModal visible={showStartTime} value={startTime} onConfirm={setStartTime} onClose={() => setShowStartTime(false)} colors={colors} />
            <TimePickerModal visible={showEndTime} value={endTime} onConfirm={setEndTime} onClose={() => setShowEndTime(false)} colors={colors} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: SPACING.xxxl + SPACING.lg }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loadingTimeline} onRefresh={() => fetchTimeline(selectedDate)} tintColor={colors.primary} colors={[colors.primary]} />
                }
            >
                {/* === 1. TIMELINE (VIEW-ONLY, 5 min) === */}
                <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.xs }}>
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Lịch sân</Text>
                        <TouchableOpacity
                            onPress={() => setShowTimelineDate(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: SPACING.xs,
                                backgroundColor: colors.background,
                                borderRadius: BORDER_RADIUS.full,
                                borderWidth: 1,
                                borderColor: colors.border,
                                paddingVertical: 6,
                                paddingHorizontal: SPACING.sm,
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                {formatDateVN(selectedDate)}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm, gap: 6 }}>
                        {weekDays.map((date, i) => {
                            const isSelected = toDateParam(date) === toDateParam(selectedDate);
                            const isPast = date < today;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => { if (!isPast) setSelectedDate(date); }}
                                    style={{
                                        minWidth: 30, alignItems: 'center',
                                        paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
                                        borderRadius: BORDER_RADIUS.md,
                                        backgroundColor: isSelected ? colors.primary : 'transparent',
                                        borderWidth: 1,
                                        borderColor: isSelected ? colors.primary : (isPast ? colors.divider : colors.border),
                                        opacity: isPast ? 0.4 : 1,
                                    }}
                                    disabled={isPast} activeOpacity={0.8}
                                >
                                    <Text style={{ fontSize: 10, color: isSelected ? '#fff' : colors.textHint, marginBottom: 2 }}>
                                        {VI_WEEKDAY_SHORT[date.getDay()]}
                                    </Text>
                                    <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: isSelected ? '#fff' : colors.textPrimary }}>
                                        {pad(date.getDate())}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs }}>
                        <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.sm }}>
                            {formatDateHeading(selectedDate)}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg }}>
                            {[
                                { color: '#4ADE80', label: 'Còn trống' },
                                { color: '#374151', label: 'Đã qua' },
                                { color: '#F87171', label: 'Đã đặt' },
                                { color: '#FCD34D', label: 'Chờ duyệt' },
                            ].map(({ color, label }) => (
                                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
                                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }}>{label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: SPACING.sm }}>
                        {loadingTimeline ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={{ marginTop: SPACING.sm, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Đang tải lịch...</Text>
                            </View>
                        ) : timelineError ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center', gap: SPACING.md }}>
                                <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: FONT_SIZE.sm }}>{timelineError}</Text>
                                <TouchableOpacity
                                    onPress={() => fetchTimeline(selectedDate)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md }}
                                >
                                    <Ionicons name="refresh-outline" size={14} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm }}>Thử lại</Text>
                                </TouchableOpacity>
                            </View>
                        ) : slotRows.length === 0 ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center', gap: SPACING.md }}>
                                <Ionicons name="calendar-outline" size={40} color={colors.textHint} />
                                <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZE.sm }}>
                                    {toDateParam(selectedDate) === toDateParam(today)
                                        ? 'Hôm nay không còn khung giờ nào'
                                        : 'Không có dữ liệu lịch'}
                                </Text>
                            </View>
                        ) : (
                            <Animated.View style={{ opacity: fadeAnim }}>
                                {slotRows.map((row, ri) => (
                                    <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
                                        {row.map((slot, ci) => renderSlotCell(slot, `${ri}-${ci}`))}
                                    </View>
                                ))}
                            </Animated.View>
                        )}
                    </View>
                </View>

                {/* === 2. THONG TIN SAN === */}
                <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    {pitchImage ? (
                        <Image source={{ uri: IMAGE_BASE_URL + pitchImage }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" />
                    ) : (
                        <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="football-outline" size={48} color={colors.textHint} />
                        </View>
                    )}

                    <View style={{ padding: SPACING.md }}>
                        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.sm }}>
                            {pitch?.name ?? '...'}
                        </Text>

                        {pitch && (
                            <View style={{ flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.md }}>
                                <View style={{ backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary }}>
                                        {PITCH_TYPE_LABEL[pitch.pitchType]}
                                    </Text>
                                </View>
                                <View style={{ borderWidth: 1, borderColor: pitch.status === 'ACTIVE' ? '#4ADE80' : '#F87171', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: pitch.status === 'ACTIVE' ? '#4ADE80' : '#F87171' }}>
                                        {PITCH_STATUS_LABEL[pitch.status]}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {pitch ? (
                            <>
                                <PitchInfoRow emoji="📍" label="Địa chỉ:" value={pitch.address} />
                                <PitchInfoRow emoji="⏱" label="Slot:" value={`${timeline?.slotMinutes ?? 30} phút`} />
                                <PitchInfoRow emoji="🕐" label="Giờ mở cửa:" value={pitch.open24h ? 'Mở cửa 24/7' : `${(pitch.openTime ?? '?').slice(0, 5)} – ${(pitch.closeTime ?? '?').slice(0, 5)}`} />
                                <PitchInfoRow emoji="📐" label="Kích thước:" value={dimensionStr} />
                                <PitchInfoRow emoji="📏" label="Diện tích:" value={areaStr} />
                                <PitchInfoRow emoji="🧰" label="Thiết bị sân:" value="Chưa cập nhật" />

                                <View style={{ paddingTop: SPACING.sm }}>
                                    {pitch.hourlyPrices && pitch.hourlyPrices.length > 0 ? (
                                        <>
                                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm }}>
                                                Giá theo khung giờ
                                            </Text>
                                            {pitch.hourlyPrices.map((hp, i) => (
                                                <View key={i} style={{
                                                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                                    paddingVertical: SPACING.sm,
                                                    borderBottomWidth: i < pitch.hourlyPrices.length - 1 ? 1 : 0,
                                                    borderBottomColor: colors.divider,
                                                }}>
                                                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                                                        {`${(hp.startTime ?? '').slice(0, 5)} - ${(hp.endTime ?? '').slice(0, 5)}`}
                                                    </Text>
                                                    <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.primary }}>
                                                        {formatVND(hp.pricePerHour)} / giờ
                                                    </Text>
                                                </View>
                                            ))}
                                        </>
                                    ) : (
                                        <Text style={{ fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: colors.primary }}>
                                            {formatVND(pitch.pricePerHour)} / giờ
                                        </Text>
                                    )}
                                </View>
                            </>
                        ) : (
                            <ActivityIndicator color={colors.primary} style={{ marginVertical: SPACING.lg }} />
                        )}
                    </View>
                </View>

                {/* === 3. FORM DAT SAN === */}
                <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Thông tin đặt sân</Text>
                    </View>

                    <View style={{ padding: SPACING.md, gap: SPACING.md }}>

                        <View style={{ gap: SPACING.sm }}>
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bắt đầu</Text>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                                <DateBtn label="NGÀY BẮT ĐẦU" value={startDate} onPress={() => setShowStartDate(true)} />
                                <TimeBtn label="GIờ BẮT ĐẦU" value={startTime} onPress={() => setShowStartTime(true)} />
                            </View>
                        </View>

                        <View style={{ gap: SPACING.sm }}>
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kết thúc</Text>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                                <DateBtn label="NGÀY KẾT THÚC" value={endDate} onPress={() => setShowEndDate(true)} />
                                <TimeBtn label="GIờ KẾT THÚC" value={endTime} onPress={() => setShowEndTime(true)} />
                            </View>
                        </View>

                        <View style={{ backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md, gap: SPACING.sm }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>⏱ Thời lượng</Text>
                                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: durMins > 0 ? colors.textPrimary : colors.danger }}>
                                    {durMins > 0 ? durationLabel(durMins) : 'Không hợp lệ'}
                                </Text>
                            </View>
                            {pitch && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>📐 Kích thước</Text>
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textPrimary }}>{dimensionStr}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>📏 Diện tích</Text>
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textPrimary }}>{areaStr}</Text>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: colors.divider }} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>💰 Tạm tính</Text>
                                        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#F59E0B' }}>
                                            {durMins > 0 ? formatVND(estimatedPrice) : '--'}
                                        </Text>
                                    </View>
                                </>
                            )}
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
                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: 4, lineHeight: 16 }}>
                                Nếu không nhập, hệ thống sẽ dùng số điện thoại từ hồ sơ của bạn.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: SPACING.sm, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.md, padding: SPACING.md }}>
                            <Ionicons name="alert-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                            <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: colors.textSecondary, lineHeight: 18 }}>
                                Yêu cầu sẽ được gửi đến admin để xác nhận. Sau khi xác nhận bạn có thể thanh toán để hoàn tất đặt sân.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: (durMins > 0 && !submitting) ? '#F59E0B' : colors.textDisabled,
                                borderRadius: BORDER_RADIUS.md,
                                paddingVertical: SPACING.lg,
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                gap: SPACING.sm, minHeight: 52,
                            }}
                            onPress={handleBook}
                            disabled={durMins <= 0 || submitting}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="football-outline" size={20} color="#fff" />
                                    <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' }}>
                                        Đặt sân ngay
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: SPACING.lg }} />
            </ScrollView>
        </SafeAreaView>
    );
}
