import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import { IMAGE_BASE_URL, PITCH_STATUS_LABEL, PITCH_TYPE_LABEL } from '@utils/constants';
import { ResPitchEquipmentDTO } from '@/types/pitchEquipment.types';
import { ResPitchDTO } from '@/types/pitch.types';
import { ResPitchTimelineSlotDTO, SlotStatus } from '@/types/booking.types';
import { formatVND } from '@utils/format/currency';

export type DisplaySlot = {
    minuteOfDay: number;
    timeStr: string;
    status: SlotStatus | null;
};

const VI_WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_WEEKDAY_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const PICKER_ITEM_H = 50;

const SLOT_COLORS: Record<SlotStatus, { bg: string; border: string; text: string; label: string }> = {
    FREE: { bg: '#0A2A14', border: '#16A34A', text: '#4ADE80', label: 'TRỐNG' },
    PAST: { bg: '#0D1117', border: '#1E293B', text: '#4B5563', label: 'ĐÃ QUA' },
    PENDING: { bg: '#1C1200', border: '#92400E', text: '#FCD34D', label: 'CHỜ DUYỆT' },
    BOOKED: { bg: '#1A0000', border: '#991B1B', text: '#F87171', label: 'ĐÃ ĐẶT' },
    BOOKED_BY_OTHER: { bg: '#1A0000', border: '#991B1B', text: '#F87171', label: 'ĐÃ CÓ NGƯỜI ĐẶT' },
};

const SLOT_COLOR_UNKNOWN = { bg: '#1E293B', border: '#334155', text: '#94A3B8', label: '—' };

export function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

export function toDateParam(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
}

export function formatWeekRange(weekStart: Date): string {
    const end = addDays(weekStart, 6);
    return `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
}

export function formatDateVN(date: Date): string {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateHeading(date: Date): string {
    return `${VI_WEEKDAY_FULL[date.getDay()].toUpperCase()}, ${formatDateVN(date)}`;
}

export function buildISO(date: Date, timeStr: string): string {
    return `${toDateParam(date)}T${timeStr}:00`;
}

export function extractTimeHHmm(iso: string): string {
    const time = iso.split('T')[1] ?? '00:00:00';
    return time.slice(0, 5);
}

export function durationMinutes(startISO: string, endISO: string): number {
    return (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000;
}

export function durationLabel(mins: number): string {
    if (mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
}

export function localTimeToMinutes(t: string | null | undefined): number {
    if (!t) return 0;
    const parts = t.split(':');
    return parseInt(parts[0] ?? '0', 10) * 60 + parseInt(parts[1] ?? '0', 10);
}

export function calcEstimatedPrice(startISO: string, endISO: string, pitch: ResPitchDTO): number {
    const durMins = durationMinutes(startISO, endISO);
    if (durMins <= 0) return 0;
    if (!pitch.hourlyPrices || pitch.hourlyPrices.length === 0) {
        return Math.round((durMins / 60) * (pitch.pricePerHour ?? 0));
    }
    const startMinOfDay = localTimeToMinutes(startISO.split('T')[1]);
    let total = 0;
    for (let i = 0; i < durMins; i++) {
        const tod = (startMinOfDay + i) % (24 * 60);
        let rate = pitch.pricePerHour ?? 0;
        for (const hp of pitch.hourlyPrices) {
            const hpStart = localTimeToMinutes(hp.startTime);
            const hpEnd = localTimeToMinutes(hp.endTime);
            if (tod >= hpStart && tod < hpEnd) {
                rate = hp.pricePerHour;
                break;
            }
        }
        total += rate / 60;
    }
    return Math.round(total);
}

export function normalizeImageUri(imageUrl?: string | null): string | null {
    const raw = imageUrl?.trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return `${IMAGE_BASE_URL}${raw}`;
    if (raw.startsWith('storage/')) return `${IMAGE_BASE_URL}/${raw}`;
    return `${IMAGE_BASE_URL}/storage/equipment/${raw}`;
}

function getDisplaySlotStatus(date: Date, minuteOfDay: number, apiSlots: ResPitchTimelineSlotDTO[]): SlotStatus | null {
    const h = Math.floor(minuteOfDay / 60);
    const m = minuteOfDay % 60;
    const iso = `${toDateParam(date)}T${pad(h)}:${pad(m)}:00`;
    for (const slot of apiSlots) {
        if (iso >= slot.start && iso < slot.end) return slot.status;
    }
    return null;
}

export function generateDisplaySlots(date: Date, pitch: ResPitchDTO | null, apiSlots: ResPitchTimelineSlotDTO[]): DisplaySlot[] {
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

export const TIME_OPTIONS: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
            opts.push(`${pad(h)}:${pad(m)}`);
        }
    }
    return opts;
})();

export function TimePickerModal({
    visible,
    value,
    onConfirm,
    onClose,
    colors,
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
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                                <TouchableOpacity onPress={onClose}>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>Đóng</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Chọn giờ</Text>
                                <TouchableOpacity onPress={() => { onConfirm(tempVal); onClose(); }}>
                                    <Text style={{ fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.bold }}>Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                ref={listRef}
                                data={TIME_OPTIONS}
                                style={{ height: 300 }}
                                keyExtractor={(t) => t}
                                getItemLayout={(_, i) => ({ length: PICKER_ITEM_H, offset: PICKER_ITEM_H * i, index: i })}
                                showsVerticalScrollIndicator={false}
                                onScrollToIndexFailed={(info) => {
                                    setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 200);
                                }}
                                renderItem={({ item }) => {
                                    const sel = item === tempVal;
                                    return (
                                        <TouchableOpacity
                                            style={{
                                                height: PICKER_ITEM_H,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                backgroundColor: sel ? `${colors.primary}28` : 'transparent',
                                            }}
                                            onPress={() => setTempVal(item)}
                                        >
                                            <Text style={{ fontSize: sel ? FONT_SIZE.xxl : FONT_SIZE.xl, fontWeight: sel ? FONT_WEIGHT.bold : FONT_WEIGHT.regular, color: sel ? colors.primary : colors.textSecondary }}>
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

export function DatePickerModal({
    visible,
    value,
    onConfirm,
    onClose,
    colors,
}: {
    visible: boolean;
    value: Date;
    onConfirm: (d: Date) => void;
    onClose: () => void;
    colors: any;
}) {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const [viewYear, setViewYear] = useState(value.getFullYear());
    const [viewMonth, setViewMonth] = useState(value.getMonth());

    useEffect(() => {
        if (!visible) return;
        setViewYear(value.getFullYear());
        setViewMonth(value.getMonth());
    }, [visible, value]);

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const cells: (number | null)[] = [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', paddingHorizontal: SPACING.lg }}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                                <TouchableOpacity onPress={prevMonth} style={{ padding: SPACING.sm }}>
                                    <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{`Tháng ${pad(viewMonth + 1)}/${viewYear}`}</Text>
                                <TouchableOpacity onPress={nextMonth} style={{ padding: SPACING.sm }}>
                                    <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', marginBottom: SPACING.sm }}>
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
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
                                                    flex: 1,
                                                    height: 38,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    borderRadius: BORDER_RADIUS.full,
                                                    backgroundColor: isSelected ? colors.primary : isToday ? colors.primaryLight : 'transparent',
                                                    opacity: isPast ? 0.3 : 1,
                                                }}
                                            >
                                                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: isSelected || isToday ? FONT_WEIGHT.bold : FONT_WEIGHT.regular, color: isSelected ? '#fff' : isToday ? colors.primary : colors.textPrimary }}>
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

export function BookingDateButton({ label, value, onPress, colors }: { label: string; value: Date; onPress: () => void; colors: any }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ flex: 1, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}>
            <Text style={{ fontSize: 10, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>{formatDateVN(value)}</Text>
            </View>
        </TouchableOpacity>
    );
}

export function BookingTimeButton({ label, value, onPress, colors }: { label: string; value: string; onPress: () => void; colors: any }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ flex: 1, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}>
            <Text style={{ fontSize: 10, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{value}</Text>
            </View>
        </TouchableOpacity>
    );
}

export function PitchInfoRow({ emoji, label, value, multiLine, colors }: { emoji: string; label: string; value: string; multiLine?: boolean; colors: any }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: multiLine ? 'flex-start' : 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Text style={{ width: 22, fontSize: FONT_SIZE.sm }}>{emoji}</Text>
            <Text style={{ width: 110, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>{label}</Text>
            <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, textAlign: 'right' }}>{value}</Text>
        </View>
    );
}

export function BookingTimelinePanel({
    colors,
    selectedDate,
    today,
    weekDays,
    weekRangeLabel,
    loadingTimeline,
    timelineError,
    slotRows,
    onOpenDatePicker,
    onSelectDate,
    onRetry,
}: {
    colors: any;
    selectedDate: Date;
    today: Date;
    weekDays: Date[];
    weekRangeLabel: string;
    loadingTimeline: boolean;
    timelineError: string | null;
    slotRows: (DisplaySlot | null)[][];
    onOpenDatePicker: () => void;
    onSelectDate: (date: Date) => void;
    onRetry: () => void;
}) {
    const renderSlotCell = (slot: DisplaySlot | null, key: string) => {
        if (!slot) return <View key={key} style={{ flex: 1, marginBottom: 4 }} />;
        const cfg = slot.status ? SLOT_COLORS[slot.status] : SLOT_COLOR_UNKNOWN;
        const endMins = slot.minuteOfDay + 5;
        const endStr = `${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`;
        return (
            <View
                key={key}
                style={{
                    flex: 1,
                    marginBottom: 4,
                    backgroundColor: cfg.bg,
                    borderRadius: BORDER_RADIUS.sm,
                    borderWidth: 1,
                    borderColor: cfg.border,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#E2E8F0', textAlign: 'center' }}>
                    {slot.timeStr} - {endStr}
                </Text>
                <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: cfg.text, marginTop: 3, textAlign: 'center' }}>
                    {cfg.label}
                </Text>
            </View>
        );
    };

    return (
        <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>Lịch sân</Text>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: 2 }}>{weekRangeLabel}</Text>
                </View>
                <TouchableOpacity
                    onPress={onOpenDatePicker}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: SPACING.sm }}
                >
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>{formatDateVN(selectedDate)}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm, gap: 6 }}>
                {weekDays.map((date, i) => {
                    const isSelected = toDateParam(date) === toDateParam(selectedDate);
                    const isPast = date < today;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => { if (!isPast) onSelectDate(date); }}
                            disabled={isPast}
                            style={{
                                minWidth: 40,
                                alignItems: 'center',
                                paddingVertical: SPACING.sm,
                                paddingHorizontal: SPACING.md,
                                borderRadius: BORDER_RADIUS.md,
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderWidth: 1,
                                borderColor: isSelected ? colors.primary : isPast ? colors.divider : colors.border,
                                opacity: isPast ? 0.4 : 1,
                            }}
                        >
                            <Text style={{ fontSize: 10, color: isSelected ? '#fff' : colors.textHint, marginBottom: 2 }}>{VI_WEEKDAY_SHORT[date.getDay()]}</Text>
                            <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: isSelected ? '#fff' : colors.textPrimary }}>{pad(date.getDate())}</Text>
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
                        { color: '#F87171', label: 'Đã đặt' },
                        { color: '#FCD34D', label: 'Chờ duyệt' },
                        { color: '#4B5563', label: 'Đã qua' },
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
                        <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: FONT_SIZE.sm }}>{timelineError}</Text>
                        <TouchableOpacity onPress={onRetry} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md }}>
                            <Ionicons name="refresh-outline" size={14} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm }}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : slotRows.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center', gap: SPACING.md }}>
                        <Ionicons name="calendar-outline" size={40} color={colors.textHint} />
                        <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZE.sm }}>
                            {toDateParam(selectedDate) === toDateParam(today) ? 'Hôm nay không còn khung giờ nào' : 'Không có dữ liệu lịch'}
                        </Text>
                    </View>
                ) : (
                    slotRows.map((row, ri) => (
                        <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
                            {row.map((slot, ci) => renderSlotCell(slot, `${ri}-${ci}`))}
                        </View>
                    ))
                )}
            </View>
        </View>
    );
}

export function PitchSummaryCard({
    colors,
    pitch,
    pitchImageUri,
    timelineSlotMinutes,
    dimensionStr,
    areaStr,
    pitchEquipmentSummary,
    onPreviewImage,
    loading,
}: {
    colors: any;
    pitch: ResPitchDTO | null;
    pitchImageUri: string | null;
    timelineSlotMinutes?: number;
    dimensionStr: string;
    areaStr: string;
    pitchEquipmentSummary: string;
    onPreviewImage?: (uri: string) => void;
    loading?: boolean;
}) {
    return (
        <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            {pitchImageUri ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => onPreviewImage?.(pitchImageUri)}>
                    <Image source={{ uri: pitchImageUri }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" />
                </TouchableOpacity>
            ) : (
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="football-outline" size={48} color={colors.textHint} />
                </View>
            )}
            <View style={{ padding: SPACING.md }}>
                <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.sm }}>
                    {pitch?.name ?? 'Đang tải...'}
                </Text>
                {pitch ? (
                    <View style={{ flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.md }}>
                        <View style={{ backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary }}>{PITCH_TYPE_LABEL[pitch.pitchType]}</Text>
                        </View>
                        <View style={{ borderWidth: 1, borderColor: pitch.status === 'ACTIVE' ? '#4ADE80' : '#F87171', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                            <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: pitch.status === 'ACTIVE' ? '#4ADE80' : '#F87171' }}>{PITCH_STATUS_LABEL[pitch.status]}</Text>
                        </View>
                    </View>
                ) : null}
                {pitch ? (
                    <>
                        <PitchInfoRow emoji="📍" label="Địa chỉ:" value={pitch.address} multiLine colors={colors} />
                        {typeof timelineSlotMinutes === 'number' ? <PitchInfoRow emoji="⏱" label="Slot:" value={`${timelineSlotMinutes} phút`} colors={colors} /> : null}
                        <PitchInfoRow emoji="🕐" label="Giờ mở cửa:" value={pitch.open24h ? 'Mở cửa 24/7' : `${(pitch.openTime ?? '?').slice(0, 5)} - ${(pitch.closeTime ?? '?').slice(0, 5)}`} colors={colors} />
                        <PitchInfoRow emoji="📐" label="Kích thước:" value={dimensionStr} colors={colors} />
                        <PitchInfoRow emoji="📏" label="Diện tích:" value={areaStr} colors={colors} />
                        <PitchInfoRow emoji="🧰" label="Thiết bị sân:" value={pitchEquipmentSummary} multiLine colors={colors} />
                        <View style={{ paddingTop: SPACING.sm }}>
                            {pitch.hourlyPrices && pitch.hourlyPrices.length > 0 ? (
                                <>
                                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm }}>
                                        Giá theo khung giờ
                                    </Text>
                                    {pitch.hourlyPrices.map((hp, i) => (
                                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: i < pitch.hourlyPrices.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>{`${(hp.startTime ?? '').slice(0, 5)} - ${(hp.endTime ?? '').slice(0, 5)}`}</Text>
                                            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.primary }}>{formatVND(hp.pricePerHour)} / giờ</Text>
                                        </View>
                                    ))}
                                </>
                            ) : (
                                <Text style={{ fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: colors.primary }}>{formatVND(pitch.pricePerHour)} / giờ</Text>
                            )}
                        </View>
                    </>
                ) : loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: SPACING.lg }} />
                ) : null}
            </View>
        </View>
    );
}

export function BookingFormSection({
    colors,
    title,
    startDate,
    endDate,
    startTime,
    endTime,
    onPressStartDate,
    onPressEndDate,
    onPressStartTime,
    onPressEndTime,
    durationText,
    durationError,
    dimensionStr,
    areaStr,
    estimatedPriceText,
    phone,
    onChangePhone,
    phoneHint,
    notice,
    topContent,
    action,
}: {
    colors: any;
    title: string;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    onPressStartDate: () => void;
    onPressEndDate: () => void;
    onPressStartTime: () => void;
    onPressEndTime: () => void;
    durationText: string;
    durationError?: boolean;
    dimensionStr?: string;
    areaStr?: string;
    estimatedPriceText: string;
    phone: string;
    onChangePhone: (text: string) => void;
    phoneHint?: string;
    notice?: string;
    topContent?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{title}</Text>
            </View>

            <View style={{ padding: SPACING.md, gap: SPACING.md }}>
                {topContent}

                <View style={{ gap: SPACING.sm }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bắt đầu</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                        <BookingDateButton label="Ngày bắt đầu" value={startDate} onPress={onPressStartDate} colors={colors} />
                        <BookingTimeButton label="Giờ bắt đầu" value={startTime} onPress={onPressStartTime} colors={colors} />
                    </View>
                </View>

                <View style={{ gap: SPACING.sm }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kết thúc</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                        <BookingDateButton label="Ngày kết thúc" value={endDate} onPress={onPressEndDate} colors={colors} />
                        <BookingTimeButton label="Giờ kết thúc" value={endTime} onPress={onPressEndTime} colors={colors} />
                    </View>
                </View>

                <View style={{ backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md, gap: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Thời lượng</Text>
                        <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: durationError ? '#EF4444' : colors.textPrimary }}>
                            {durationText}
                        </Text>
                    </View>
                    {dimensionStr ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Kích thước</Text>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textPrimary }}>{dimensionStr}</Text>
                        </View>
                    ) : null}
                    {areaStr ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Diện tích</Text>
                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textPrimary }}>{areaStr}</Text>
                        </View>
                    ) : null}
                    {dimensionStr || areaStr ? <View style={{ height: 1, backgroundColor: colors.divider }} /> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Tạm tính</Text>
                        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: '#F59E0B' }}>
                            {estimatedPriceText}
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
                            onChangeText={onChangePhone}
                            keyboardType="phone-pad"
                            maxLength={15}
                        />
                    </View>
                    {phoneHint ? (
                        <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: 4, lineHeight: 16 }}>
                            {phoneHint}
                        </Text>
                    ) : null}
                </View>

                {notice ? (
                    <View style={{ flexDirection: 'row', gap: SPACING.sm, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.md, padding: SPACING.md }}>
                        <Ionicons name="alert-circle-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: colors.textSecondary, lineHeight: 18 }}>
                            {notice}
                        </Text>
                    </View>
                ) : null}

                {action}
            </View>
        </View>
    );
}

export function EquipmentBorrowSection({
    colors,
    loading,
    borrowableEquipments,
    rowOn,
    quantities,
    rowNotes,
    borrowNote,
    borrowConditionAcknowledged,
    borrowReportPrintOptIn,
    onToggleRow,
    onDecreaseQty,
    onIncreaseQty,
    onChangeRowNote,
    onChangeBorrowNote,
    onToggleBorrowConditionAcknowledged,
    onToggleBorrowReportPrintOptIn,
    onPreviewImage,
    title,
    description,
}: {
    colors: any;
    loading: boolean;
    borrowableEquipments: ResPitchEquipmentDTO[];
    rowOn: Record<number, boolean>;
    quantities: Record<number, number>;
    rowNotes: Record<number, string>;
    borrowNote: string;
    borrowConditionAcknowledged: boolean;
    borrowReportPrintOptIn: boolean;
    onToggleRow: (item: ResPitchEquipmentDTO, value: boolean, maxQty: number) => void;
    onDecreaseQty: (item: ResPitchEquipmentDTO) => void;
    onIncreaseQty: (item: ResPitchEquipmentDTO, maxQty: number) => void;
    onChangeRowNote: (item: ResPitchEquipmentDTO, text: string) => void;
    onChangeBorrowNote: (text: string) => void;
    onToggleBorrowConditionAcknowledged: () => void;
    onToggleBorrowReportPrintOptIn: () => void;
    onPreviewImage?: (uri: string) => void;
    title?: string;
    description?: string;
}) {
    return (
        <View style={{ margin: SPACING.md, marginBottom: 0, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{title ?? 'Thiết bị mượn thêm (lưu động)'}</Text>
                {description ? <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>{description}</Text> : null}
            </View>
            <View style={{ padding: SPACING.md, gap: SPACING.md }}>
                {loading ? (
                    <View style={{ paddingVertical: SPACING.xl, alignItems: 'center' }}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : borrowableEquipments.length === 0 ? (
                    <View style={{ paddingVertical: SPACING.xl, alignItems: 'center', gap: SPACING.sm }}>
                        <Ionicons name="construct-outline" size={28} color={colors.textHint} />
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, textAlign: 'center' }}>Chưa có thiết bị cho mượn trên sân này hoặc hiện đang hết hàng.</Text>
                    </View>
                ) : (
                    borrowableEquipments.map((item) => {
                        const maxQty = Math.min(item.quantity ?? 0, item.equipmentAvailableQuantity ?? item.quantity ?? 0);
                        const disabled = maxQty <= 0;
                        const isOn = !!rowOn[item.id];
                        const imageUri = normalizeImageUri(item.equipmentImageUrl);
                        return (
                            <View key={item.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, backgroundColor: colors.background }}>
                                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                                    <TouchableOpacity
                                        activeOpacity={imageUri ? 0.8 : 1}
                                        disabled={!imageUri}
                                        onPress={() => imageUri && onPreviewImage?.(imageUri)}
                                        style={{ width: 72, height: 72, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}
                                    >
                                        {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Ionicons name="image-outline" size={22} color={colors.textHint} />}
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{item.equipmentName}</Text>
                                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary, marginTop: 2 }}>Tối đa {maxQty} / sân</Text>
                                            </View>
                                            <Switch
                                                value={isOn}
                                                disabled={disabled}
                                                onValueChange={(value) => onToggleRow(item, value, maxQty)}
                                                trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                                                thumbColor={isOn ? colors.primary : '#f4f4f5'}
                                            />
                                        </View>
                                        {item.equipmentConditionNote ? <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, marginTop: 4 }}>Ghi chú từ sân: {item.equipmentConditionNote}</Text> : null}
                                        {disabled ? <Text style={{ fontSize: FONT_SIZE.xs, color: '#EF4444', marginTop: 6, fontWeight: FONT_WEIGHT.semibold }}>Hết hàng</Text> : null}
                                    </View>
                                </View>

                                {isOn && !disabled ? (
                                    <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Số lượng</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                                                <TouchableOpacity onPress={() => onDecreaseQty(item)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                                                </TouchableOpacity>
                                                <Text style={{ minWidth: 24, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{quantities[item.id] ?? 1}</Text>
                                                <TouchableOpacity onPress={() => onIncreaseQty(item, maxQty)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: SPACING.md }}>
                                            <TextInput
                                                style={{ minHeight: 76, paddingVertical: SPACING.md, color: colors.textPrimary, fontSize: FONT_SIZE.sm, textAlignVertical: 'top' }}
                                                multiline
                                                placeholder="Ghi chú tình trạng riêng cho thiết bị này"
                                                placeholderTextColor={colors.textHint}
                                                value={rowNotes[item.id] ?? ''}
                                                onChangeText={(text) => onChangeRowNote(item, text)}
                                            />
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })
                )}

                <View style={{ backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: SPACING.md }}>
                    <TextInput
                        style={{ minHeight: 88, paddingVertical: SPACING.md, color: colors.textPrimary, fontSize: FONT_SIZE.sm, textAlignVertical: 'top' }}
                        multiline
                        placeholder="Ghi chú tình trạng chung cho các thiết bị mượn"
                        placeholderTextColor={colors.textHint}
                        value={borrowNote}
                        onChangeText={onChangeBorrowNote}
                    />
                </View>

                <TouchableOpacity activeOpacity={0.85} onPress={onToggleBorrowConditionAcknowledged} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                    <Ionicons name={borrowConditionAcknowledged ? 'checkbox' : 'square-outline'} size={20} color={borrowConditionAcknowledged ? colors.primary : colors.textHint} />
                    <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 }}>Tôi đã kiểm tra tình trạng thiết bị trước khi xác nhận mượn.</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.85} onPress={onToggleBorrowReportPrintOptIn} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                    <Ionicons name={borrowReportPrintOptIn ? 'checkbox' : 'square-outline'} size={20} color={borrowReportPrintOptIn ? colors.primary : colors.textHint} />
                    <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20 }}>In kèm biên bản mượn thiết bị nếu sân hỗ trợ.</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
