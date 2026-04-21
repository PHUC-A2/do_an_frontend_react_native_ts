import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Alert,
    StyleSheet,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';
import { ClientStackParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { ResBookingDTO, BookingStatus } from '@/types/booking.types';
import { ResBookingEquipmentDTO, ReqUpdateBookingEquipmentStatusDTO } from '@/types/bookingEquipment.types';
import { bookingService } from '@services/booking.service';
import { BOOKING_STATUS_LABEL } from '@utils/constants';
import { BOOKING_EQUIPMENT_STATUS_META } from '@utils/constants/bookingEquipment.constants';
import { formatDateTime, formatTime } from '@utils/format/date';
import { formatVND } from '@utils/format/currency';
import EmptyState from '@components/common/EmptyState';
import GuestPrompt from '@components/common/GuestPrompt';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// ─── Status color ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Partial<Record<BookingStatus, { text: string; bg: string }>> = {
    PENDING:   { text: '#F59E0B', bg: '#FEF3C7' },
    ACTIVE:    { text: '#16A34A', bg: '#DCFCE7' },
    CONFIRMED: { text: '#16A34A', bg: '#DCFCE7' },
    PAID:      { text: '#3B82F6', bg: '#EFF6FF' },
    CHECKIN:   { text: '#0EA5E9', bg: '#E0F2FE' },
    COMPLETED: { text: '#6B7280', bg: '#F3F4F6' },
    CANCELLED: { text: '#EF4444', bg: '#FEE2E2' },
    NO_SHOW:   { text: '#9333EA', bg: '#F5F3FF' },
};

function getStatusColor(status: BookingStatus) {
    return STATUS_COLOR[status] ?? { text: '#6B7280', bg: '#F3F4F6' };
}

function durationLabel(startISO: string, endISO: string, durationMinutes?: number): string {
    const mins = durationMinutes ?? (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000;
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
}

function hasUnreturnedEquipments(equips: ResBookingEquipmentDTO[]): boolean {
    return equips.some((equip) => !equip.deletedByClient && equip.status === 'BORROWED');
}

// ─── Tab ─────────────────────────────────────────────────────────────────────
type TabKey = 'upcoming' | 'history' | 'equipment';
const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'upcoming',  label: 'Sắp đá',       icon: 'football-outline' },
    { key: 'history',   label: 'Lịch sử',       icon: 'time-outline' },
    { key: 'equipment', label: 'Thiết bị mượn', icon: 'construct-outline' },
];

// ─── Return Modal ─────────────────────────────────────────────────────────────
type ReturnPreset = 'full' | 'lost' | 'damaged';

interface ReturnModalProps {
    visible: boolean;
    equip: ResBookingEquipmentDTO | null;
    preset: ReturnPreset;
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: ReqUpdateBookingEquipmentStatusDTO & { returnNote: string }) => void;
}

const ReturnModal = ({ visible, equip, preset, loading, onClose, onSubmit }: ReturnModalProps) => {
    const { colors, isDark } = useTheme();
    const [qtyGood, setQtyGood] = useState('');
    const [qtyLost, setQtyLost] = useState('');
    const [qtyDamaged, setQtyDamaged] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [returnerName, setReturnerName] = useState('');
    const [returnerPhone, setReturnerPhone] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');

    useEffect(() => {
        if (equip && visible) {
            if (preset === 'full') {
                setQtyGood(String(equip.quantity));
                setQtyLost('0');
                setQtyDamaged('0');
            } else if (preset === 'lost') {
                setQtyGood('0');
                setQtyLost(String(equip.quantity));
                setQtyDamaged('0');
            } else {
                setQtyGood('0');
                setQtyLost('0');
                setQtyDamaged(String(equip.quantity));
            }
            setReturnNote('');
            setReturnerName('');
            setReturnerPhone('');
            setReceiverName('');
            setReceiverPhone('');
        }
    }, [equip, preset, visible]);

    if (!equip) return null;

    const presetMeta = {
        full:    { title: 'Xác nhận trả thiết bị', status: 'RETURNED' as const, color: '#16A34A' },
        lost:    { title: 'Báo mất thiết bị',       status: 'LOST'     as const, color: '#EF4444' },
        damaged: { title: 'Báo hỏng thiết bị',      status: 'DAMAGED'  as const, color: '#F59E0B' },
    }[preset];

    const total = (parseInt(qtyGood) || 0) + (parseInt(qtyLost) || 0) + (parseInt(qtyDamaged) || 0);
    const isValid = total === equip.quantity;

    const handleSubmit = () => {
        if (!isValid) {
            Alert.alert('Lỗi', `Tổng số lượng phải bằng ${equip.quantity}`);
            return;
        }
        if (!receiverName.trim() || !receiverPhone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập họ tên và số điện thoại người nhận thiết bị tại sân.');
            return;
        }
        onSubmit({
            status: presetMeta.status,
            quantityReturnedGood: parseInt(qtyGood) || 0,
            quantityLost: parseInt(qtyLost) || 0,
            quantityDamaged: parseInt(qtyDamaged) || 0,
            returnConditionNote: returnNote.trim() || undefined,
            borrowerSignName: null,
            staffSignName: null,
            returnerName: returnerName.trim() || null,
            returnerPhone: returnerPhone.trim() || null,
            receiverName: receiverName.trim(),
            receiverPhone: receiverPhone.trim(),
            returnReportPrintOptIn: null,
            returnNote,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.modalOverlay]}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <Text style={[styles.modalTitle, { color: presetMeta.color }]}>
                                {presetMeta.title}
                            </Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={22} color={colors.textHint} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>
                            {/* Equipment name */}
                            <View style={[styles.equipInfoBox, { backgroundColor: colors.surfaceVariant }]}>
                                <Ionicons name="construct-outline" size={16} color={colors.primary} />
                                <Text style={{ flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                                    {equip.equipmentName}
                                </Text>
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>
                                    Mượn: {equip.quantity}
                                </Text>
                            </View>

                            {/* Quantity inputs */}
                            <View style={{ gap: SPACING.sm }}>
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                                    Chi tiết số lượng (tổng phải = {equip.quantity})
                                </Text>
                                <View style={styles.qtyRow}>
                                    {[
                                        { label: 'Trả tốt', value: qtyGood, set: setQtyGood, color: '#16A34A' },
                                        { label: 'Bị hỏng', value: qtyDamaged, set: setQtyDamaged, color: '#F59E0B' },
                                        { label: 'Bị mất',  value: qtyLost,    set: setQtyLost,    color: '#EF4444' },
                                    ].map(({ label, value, set, color }) => (
                                        <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint }}>{label}</Text>
                                            <TextInput
                                                style={[styles.qtyInput, { borderColor: color, color: colors.textPrimary, backgroundColor: colors.background }]}
                                                value={value}
                                                onChangeText={set}
                                                keyboardType="numeric"
                                                maxLength={3}
                                                selectTextOnFocus
                                            />
                                        </View>
                                    ))}
                                </View>
                                {!isValid && (
                                    <Text style={{ fontSize: FONT_SIZE.xs, color: '#EF4444', textAlign: 'center' }}>
                                        Tổng hiện tại: {total} / {equip.quantity}
                                    </Text>
                                )}
                            </View>

                            {/* Return note */}
                            <View style={{ gap: SPACING.xs }}>
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                                    Ghi chú biên bản khi trả (tình trạng nhận lại)
                                </Text>
                                <TextInput
                                    style={[styles.noteInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={returnNote}
                                    onChangeText={setReturnNote}
                                    placeholder="VD: đủ phụ kiện, có trầy nhẹ..."
                                    placeholderTextColor={colors.textHint}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={{ gap: SPACING.xs }}>
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                                    Người trả thực tế (để trống = người đặt sân)
                                </Text>
                                <TextInput
                                    style={[styles.singleLineInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={returnerName}
                                    onChangeText={setReturnerName}
                                    placeholder="Họ tên người giao trả"
                                    placeholderTextColor={colors.textHint}
                                />
                                <TextInput
                                    style={[styles.singleLineInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={returnerPhone}
                                    onChangeText={setReturnerPhone}
                                    placeholder="Số điện thoại người trả (tùy chọn)"
                                    placeholderTextColor={colors.textHint}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={{ gap: SPACING.xs }}>
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                                    Người nhận thiết bị tại sân (nhân viên / bên giao nhận - bắt buộc)
                                </Text>
                                <TextInput
                                    style={[styles.singleLineInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={receiverName}
                                    onChangeText={setReceiverName}
                                    placeholder="Họ tên người nhận"
                                    placeholderTextColor={colors.textHint}
                                />
                                <TextInput
                                    style={[styles.singleLineInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={receiverPhone}
                                    onChangeText={setReceiverPhone}
                                    placeholder="Số điện thoại người nhận"
                                    placeholderTextColor={colors.textHint}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.modalFooter, { borderTopColor: colors.divider }]}>
                            <TouchableOpacity
                                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium }}>Huỷ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnPrimary, { backgroundColor: presetMeta.color, opacity: isValid ? 1 : 0.5 }]}
                                onPress={handleSubmit}
                                disabled={loading || !isValid}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                        <Text style={{ fontSize: FONT_SIZE.md, color: '#fff', fontWeight: FONT_WEIGHT.semibold }}>
                                            Xác nhận
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── BookingCard ──────────────────────────────────────────────────────────────
interface BookingCardProps {
    item: ResBookingDTO;
    equips: ResBookingEquipmentDTO[];
    actionLoading: number | null;
    onViewDetail: (id: number) => void;
    onViewEquipment: (equipmentId: number) => void;
    onEdit: (id: number, pitchId: number) => void;
    onCancel: (id: number) => void;
    onDelete: (booking: ResBookingDTO, equips: ResBookingEquipmentDTO[]) => void;
    onPay: (id: number) => void;
}

const BookingCard = React.memo(({
    item, equips, actionLoading, onViewDetail, onViewEquipment, onEdit, onCancel, onDelete, onPay,
}: BookingCardProps) => {
    const { colors, isDark } = useTheme();
    const [expanded, setExpanded] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim  = useRef(new Animated.Value(1)).current;
    const pulseAnim  = useRef(new Animated.Value(1)).current;

    const now        = new Date();
    const startTime  = new Date(item.startDateTime);
    const endTime    = new Date(item.endDateTime);
    const isEnded    = endTime < now;
    const isPending  = item.status === 'PENDING';
    const isActive   = item.status === 'ACTIVE' || item.status === 'CONFIRMED';
    const isPaid     = item.status === 'PAID';
    const isCancelled = item.status === 'CANCELLED';
    const hasBorrowedEquipment = hasUnreturnedEquipments(equips);

    // Đang trong khung giờ đá (bất kể trạng thái backend chưa cập nhật CHECKIN)
    const isPlaying = startTime <= now && now < endTime
        && !isCancelled && item.status !== 'NO_SHOW';

    // Bỏ điều kiện !isEnded → lịch sử có booking ACTIVE chưa thanh toán vẫn hiện nút
    const canPay    = isActive;
    const canUpdate = (isActive || isPending) && !isEnded && !isPaid;
    const canCancel = (isActive || isPending) && !isEnded && !isPaid;
    const canDeleteBase = isPaid || isCancelled;
    const canDelete = canDeleteBase && !hasBorrowedEquipment;

    const statusMeta = getStatusColor(item.status);
    const isBusy = actionLoading === item.id;

    // Hiệu ứng nhấp nháy cho "Đang đá"
    useEffect(() => {
        if (!isPlaying) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isPlaying]);

    const toggleExpand = () => {
        const toValue = expanded ? 0 : 1;
        Animated.parallel([
            Animated.spring(rotateAnim, { toValue, useNativeDriver: true }),
        ]).start();
        setExpanded(!expanded);
    };

    const arrowRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const shadowStyle = isDark ? {} : SHADOW.md;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={toggleExpand}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="football" size={18} color={colors.primary} />
                        </View>
                        <Text style={{ flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }} numberOfLines={1}>
                            {item.pitchName}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        {isPlaying ? (
                            /* Badge "Đang đá" nhấp nháy */
                            <View style={[styles.statusBadge, styles.playingBadge]}>
                                <Animated.View style={[styles.playingDot, { opacity: pulseAnim }]} />
                                <Text style={[styles.statusText, styles.playingText]}>Đang đá</Text>
                            </View>
                        ) : (
                            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                                <Text style={[styles.statusText, { color: statusMeta.text }]}>
                                    {BOOKING_STATUS_LABEL[item.status] ?? item.status}
                                </Text>
                            </View>
                        )}
                        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
                            <Ionicons name="chevron-down" size={16} color={colors.textHint} />
                        </Animated.View>
                    </View>
                </View>

                {/* Time */}
                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color={isPlaying ? '#16A34A' : colors.textHint} />
                    <Text style={[styles.metaText, { color: isPlaying ? '#16A34A' : colors.textSecondary, fontWeight: isPlaying ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular }]}>
                        {formatTime(item.startDateTime)} → {formatTime(item.endDateTime)}
                    </Text>
                    <Text style={[styles.metaDot, { color: colors.textHint }]}>·</Text>
                    <Ionicons name="calendar-outline" size={14} color={colors.textHint} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {formatDateTime(item.startDateTime).split(' - ')[1]}
                    </Text>
                </View>

                {/* Duration + Price */}
                <View style={styles.footerRow}>
                    <View style={styles.metaRow}>
                        <Ionicons name="hourglass-outline" size={13} color={colors.textHint} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {durationLabel(item.startDateTime, item.endDateTime, item.durationMinutes)}
                        </Text>
                    </View>
                    <Text style={[styles.price, { color: colors.primary }]}>
                        {formatVND(item.totalPrice)}
                    </Text>
                </View>

                {/* Expanded */}
                {expanded && (
                    <View style={[styles.expandedWrap, { borderTopColor: colors.divider }]}>

                        {/* ── Detail rows – label trái / value phải ── */}
                        <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>

                            {/* Người đặt */}
                            <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                                <View style={styles.detailLeft}>
                                    <Ionicons name="person-outline" size={13} color={colors.textHint} />
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Người đặt</Text>
                                </View>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userName}</Text>
                            </View>

                            {/* Liên hệ – có nút copy */}
                            {item.contactPhone ? (
                                <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                                    <View style={styles.detailLeft}>
                                        <Ionicons name="call-outline" size={13} color={colors.textHint} />
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Liên hệ</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.copyRow}
                                        onPress={async () => {
                                            const phone = item.contactPhone ?? '';
                                            await Clipboard.setStringAsync(phone);
                                            Alert.alert('Đã sao chép', phone);
                                        }}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                        <Text style={[styles.detailValue, { color: colors.primary }]} numberOfLines={1}>{item.contactPhone}</Text>
                                        <Ionicons name="copy-outline" size={13} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            {/* Thời lượng */}
                            <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                                <View style={styles.detailLeft}>
                                    <Ionicons name="hourglass-outline" size={13} color={colors.textHint} />
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Thời lượng</Text>
                                </View>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                    {durationLabel(item.startDateTime, item.endDateTime, item.durationMinutes)}
                                </Text>
                            </View>

                            {/* Tổng tiền */}
                            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                                <View style={styles.detailLeft}>
                                    <Ionicons name="cash-outline" size={13} color={colors.textHint} />
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tổng tiền</Text>
                                </View>
                                <Text style={[styles.detailValue, { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md }]}>
                                    {formatVND(item.totalPrice)}
                                </Text>
                            </View>
                        </View>

                        {/* Thiết bị mượn kèm */}
                        <View style={[styles.equipSection, { borderTopColor: colors.divider }]}>
                            <View style={styles.metaRow}>
                                <Ionicons name="construct-outline" size={13} color={colors.textHint} />
                                <Text style={[styles.equipTitle, { color: colors.textSecondary }]}>
                                    Thiết bị mượn (kèm booking)
                                </Text>
                            </View>
                            {equips.length === 0 ? (
                                <Text style={[styles.equipEmpty, { color: colors.textHint }]}>
                                    Không có thiết bị mượn qua hệ thống
                                </Text>
                            ) : (
                                equips.map(eq => {
                                    const meta = BOOKING_EQUIPMENT_STATUS_META[eq.status];
                                    return (
                                        <TouchableOpacity
                                            key={eq.id}
                                            activeOpacity={0.82}
                                            onPress={() => onViewEquipment(eq.id)}
                                            style={[styles.equipChip, { backgroundColor: colors.surfaceVariant }]}
                                        >
                                            <Text style={[styles.equipName, { color: colors.textPrimary }]}>{eq.equipmentName}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                                                <Text style={[styles.equipQty, { color: colors.textSecondary }]}>SL: {eq.quantity}</Text>
                                                <View style={[styles.equipBadge, { backgroundColor: meta.bgColor }]}>
                                                    <Text style={[styles.equipBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>

                        {/* Timestamps */}
                        <View style={[styles.tsRow, { borderTopColor: colors.divider }]}>
                            <Text style={[styles.tsText, { color: colors.textHint }]}>Tạo: {formatDateTime(item.createdAt)}</Text>
                            <Text style={[styles.tsText, { color: colors.textHint }]}>Cập nhật: {formatDateTime(item.updatedAt)}</Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: colors.border }]}
                                onPress={() => onViewDetail(item.id)}
                            >
                                <Ionicons name="eye-outline" size={14} color={colors.primary} />
                                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Chi tiết</Text>
                            </TouchableOpacity>

                            {canUpdate && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: colors.border }]}
                                    onPress={() => onEdit(item.id, item.pitchId)}
                                    disabled={isBusy}
                                >
                                    <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Sửa</Text>
                                </TouchableOpacity>
                            )}

                            {canCancel && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                                    onPress={() => onCancel(item.id)}
                                    disabled={isBusy}
                                >
                                    {isBusy ? (
                                        <ActivityIndicator size="small" color="#EF4444" />
                                    ) : (
                                        <>
                                            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Hủy</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            {canDelete && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: colors.border }]}
                                    onPress={() => onDelete(item, equips)}
                                    disabled={isBusy}
                                >
                                    <Ionicons name="trash-outline" size={14} color={colors.textHint} />
                                    <Text style={[styles.actionBtnText, { color: colors.textHint }]}>Xóa</Text>
                                </TouchableOpacity>
                            )}

                            {canPay && (
                                <TouchableOpacity
                                    style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                                    onPress={() => onPay(item.id)}
                                    disabled={isBusy}
                                >
                                    <Ionicons name="card-outline" size={14} color="#fff" />
                                    <Text style={styles.actionBtnPrimaryText}>Thanh toán</Text>
                                </TouchableOpacity>
                            )}

                            {isPending && (
                                <View style={[styles.infoChip, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="hourglass-outline" size={12} color="#F59E0B" />
                                    <Text style={[styles.infoChipText, { color: '#F59E0B' }]}>Chờ admin xác nhận</Text>
                                </View>
                            )}

                            {canDeleteBase && hasBorrowedEquipment && (
                                <View style={[styles.infoChip, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="construct-outline" size={12} color="#F59E0B" />
                                    <Text style={[styles.infoChipText, { color: '#F59E0B' }]}>Phải trả thiết bị trước khi xóa</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── EquipmentCard ────────────────────────────────────────────────────────────
interface EquipmentCardProps {
    item: ResBookingEquipmentDTO;
    deletingId: number | null;
    updatingId: number | null;
    isHighlighted: boolean;
    onDelete: (item: ResBookingEquipmentDTO) => void;
    onViewBooking: (bookingId: number) => void;
    onReturn: (item: ResBookingEquipmentDTO, preset: ReturnPreset) => void;
}

const EquipmentCard = React.memo(({ item, deletingId, updatingId, isHighlighted, onDelete, onViewBooking, onReturn }: EquipmentCardProps) => {
    const { colors, isDark } = useTheme();
    const meta = BOOKING_EQUIPMENT_STATUS_META[item.status];
    const isDeleting = deletingId === item.id;
    const isUpdating = updatingId === item.id;
    const shadowStyle = isDark ? {} : SHADOW.sm;
    const canSwipeDelete = item.status !== 'BORROWED';

    const renderDeleteAction = () => (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onDelete(item)}
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
        >
            {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.deleteActionText}>Xóa</Text>
                </>
            )}
        </TouchableOpacity>
    );

    const cardContent = (
        <View
            style={[
                styles.equipCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: isHighlighted ? colors.primary : colors.border,
                    ...(isHighlighted ? styles.equipCardHighlight : null),
                    ...shadowStyle,
                },
            ]}
        >
            {/* Header */}
            <View style={styles.equipCardHeader}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="construct" size={16} color={colors.primary} />
                    </View>
                    <Text style={{ flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }} numberOfLines={1}>
                        {item.equipmentName}
                    </Text>
                </View>
                <View style={[styles.equipBadge, { backgroundColor: meta.bgColor }]}>
                    <Text style={[styles.equipBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.equipCardBody}>
                <View style={styles.equipStatRow}>
                    {[
                        { label: 'Mượn',    val: item.quantity,                  color: colors.textPrimary },
                        { label: 'Trả tốt', val: item.quantityReturnedGood ?? 0, color: '#16A34A' },
                        { label: 'Hỏng',    val: item.quantityDamaged ?? 0,      color: '#F59E0B' },
                        { label: 'Mất',     val: item.quantityLost ?? 0,         color: '#EF4444' },
                    ].map(({ label, val, color }, i, arr) => (
                        <React.Fragment key={label}>
                            <View style={styles.equipStat}>
                                {item.status === 'BORROWED' && label !== 'Mượn' ? (
                                    <Text style={[styles.equipStatVal, { color: colors.textHint }]}>—</Text>
                                ) : (
                                    <Text style={[styles.equipStatVal, { color }]}>{val}</Text>
                                )}
                                <Text style={[styles.equipStatLbl, { color: colors.textHint }]}>{label}</Text>
                            </View>
                            {i < arr.length - 1 && <View style={[styles.equipStatDivider, { backgroundColor: colors.divider }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Penalty */}
                {item.status === 'LOST' && item.penaltyAmount > 0 && (
                    <View style={[styles.penaltyRow, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="warning-outline" size={13} color="#EF4444" />
                        <Text style={[styles.penaltyText, { color: '#EF4444' }]}>
                            Phí đền bù: {formatVND(item.penaltyAmount)}
                        </Text>
                    </View>
                )}

                {item.borrowConditionNote ? (
                    <View style={styles.noteRow}>
                        <Ionicons name="document-text-outline" size={13} color={colors.textHint} />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>
                            Mượn: {item.borrowConditionNote}
                        </Text>
                    </View>
                ) : null}

                {item.returnConditionNote ? (
                    <View style={styles.noteRow}>
                        <Ionicons name="return-up-back-outline" size={13} color={colors.textHint} />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>
                            Trả: {item.returnConditionNote}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Actions */}
            <View style={[styles.equipCardFooter, { borderTopColor: colors.divider }]}>
                {item.status === 'BORROWED' ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.border }]}
                            onPress={() => onViewBooking(item.bookingId)}
                            disabled={isUpdating}
                        >
                            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Xem lịch đặt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                            onPress={() => onReturn(item, 'full')}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={13} color="#fff" />
                                    <Text style={styles.actionBtnPrimaryText}>Trả</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: '#F59E0B' }]}
                            onPress={() => onReturn(item, 'damaged')}
                            disabled={isUpdating}
                        >
                            <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Hỏng</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                            onPress={() => onReturn(item, 'lost')}
                            disabled={isUpdating}
                        >
                            <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Mất</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ gap: SPACING.sm }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.border, alignSelf: 'flex-start' }]}
                            onPress={() => onViewBooking(item.bookingId)}
                            disabled={isDeleting}
                        >
                            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Xem lịch đặt</Text>
                        </TouchableOpacity>
                        <View style={[styles.swipeHint, { backgroundColor: colors.surfaceVariant }]}>
                            <Ionicons name="swap-horizontal-outline" size={14} color={colors.textHint} />
                            <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>Vuốt sang trái để xóa khỏi lịch sử</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );

    if (!canSwipeDelete) {
        return cardContent;
    }

    return (
        <View style={styles.swipeRow}>
            <Swipeable overshootRight={false} renderRightActions={renderDeleteAction}>
                {cardContent}
            </Swipeable>
        </View>
    );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => {
    const { colors } = useTheme();
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, [anim]);
    return (
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: anim }]}>
            <View style={{ height: 16, width: '60%', backgroundColor: colors.border, borderRadius: 4, marginBottom: SPACING.sm }} />
            <View style={{ height: 12, width: '40%', backgroundColor: colors.border, borderRadius: 4, marginBottom: SPACING.xs }} />
            <View style={{ height: 12, width: '30%', backgroundColor: colors.border, borderRadius: 4 }} />
        </Animated.View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyBookingsScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors } = useTheme();
    const { myBookings, isLoading } = useAppSelector((s) => s.booking);
    const { isAuthenticated } = useAppSelector((s) => s.auth);
    const lastRealtimeEvent = useAppSelector((s) => s.realtime.lastEvent);

    const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
    const [refreshing, setRefreshing] = useState(false);
    const [tabBarWidth, setTabBarWidth] = useState(0);
    const [targetEquipmentId, setTargetEquipmentId] = useState<number | null>(null);
    const [highlightedEquipmentId, setHighlightedEquipmentId] = useState<number | null>(null);

    // All my equipments (used by both tabs 1/2 inline + tab 3)
    const [allMyEquips, setAllMyEquips] = useState<ResBookingEquipmentDTO[]>([]);
    const [equipLoading, setEquipLoading] = useState(false);
    const equipmentListRef = useRef<FlatList<ResBookingEquipmentDTO>>(null);

    // Actions
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [deletingEquipId, setDeletingEquipId] = useState<number | null>(null);
    const [updatingEquipId, setUpdatingEquipId] = useState<number | null>(null);

    // Return modal
    const [returnModal, setReturnModal] = useState<{
        equip: ResBookingEquipmentDTO;
        preset: ReturnPreset;
    } | null>(null);

    const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
    const tabIndex = TABS.findIndex(t => t.key === activeTab);
    useEffect(() => {
        Animated.spring(tabIndicatorAnim, { toValue: tabIndex, useNativeDriver: true }).start();
    }, [tabIndex]);

    // ─── Loaders ──────────────────────────────────────────────────────────
    const loadEquipments = useCallback(async () => {
        if (!isAuthenticated) return;
        setEquipLoading(true);
        try {
            const res = await bookingService.getAllMyEquipments();
            setAllMyEquips((res.data.data ?? []).filter(e => !e.deletedByClient));
        } catch {
            setAllMyEquips([]);
        } finally {
            setEquipLoading(false);
        }
    }, [isAuthenticated]);

    const loadBookings = useCallback(async () => {
        if (isAuthenticated) await dispatch(fetchMyBookings());
    }, [isAuthenticated, dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            loadBookings();
            loadEquipments();
        }
    }, [isAuthenticated, loadBookings, loadEquipments]);

    // Tự refresh khi quay lại màn hình (ví dụ sau khi cập nhật lịch đặt)
    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated) {
                loadBookings();
            }
        }, [isAuthenticated, loadBookings])
    );

    useEffect(() => {
        if (!isAuthenticated) return;
        if (lastRealtimeEvent?.event !== 'notification') return;

        const type = lastRealtimeEvent.notification.type;
        const bookingRelatedTypes = new Set([
            'BOOKING_CREATED',
            'BOOKING_PENDING_CONFIRMATION',
            'BOOKING_APPROVED',
            'BOOKING_REJECTED',
            'PAYMENT_REQUESTED',
            'PAYMENT_PROOF_UPLOADED',
            'PAYMENT_CONFIRMED',
            'MATCH_REMINDER',
        ]);
        const equipmentRelatedTypes = new Set([
            'EQUIPMENT_BORROWED',
            'EQUIPMENT_RETURNED',
            'EQUIPMENT_LOST',
            'EQUIPMENT_DAMAGED',
        ]);

        if (bookingRelatedTypes.has(type)) {
            void loadBookings();
        }

        if (bookingRelatedTypes.has(type) || equipmentRelatedTypes.has(type)) {
            void loadEquipments();
        }
    }, [isAuthenticated, lastRealtimeEvent, loadBookings, loadEquipments]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadBookings(), loadEquipments()]);
        setRefreshing(false);
    }, [loadBookings, loadEquipments]);

    // ─── Derived data ─────────────────────────────────────────────────────
    const { upcomingBookings, historyBookings } = useMemo(() => {
        const now = new Date();
        const upcoming: ResBookingDTO[] = [];
        const history: ResBookingDTO[] = [];
        for (const b of myBookings) {
            if (b.deletedByUser) continue;
            const isEnded = new Date(b.endDateTime) < now;
            const isCancelled = b.status === 'CANCELLED';
            // Booking ACTIVE/CONFIRMED chưa thanh toán mà đã qua giờ → vào lịch sử nhưng vẫn có nút thanh toán
            if (isEnded || isCancelled) {
                history.push(b);
            } else {
                upcoming.push(b);
            }
        }
        upcoming.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        history.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
        return { upcomingBookings: upcoming, historyBookings: history };
    }, [myBookings]);

    const equipsByBookingId = useMemo(() => {
        const m = new Map<number, ResBookingEquipmentDTO[]>();
        for (const e of allMyEquips) {
            if (e.deletedByClient) continue;
            const arr = m.get(e.bookingId) ?? [];
            arr.push(e);
            m.set(e.bookingId, arr);
        }
        return m;
    }, [allMyEquips]);

    // Tab 3 — only BORROWED or non-deleted
    const equipList = useMemo(() => allMyEquips, [allMyEquips]);

    useEffect(() => {
        if (activeTab !== 'equipment' || equipLoading || targetEquipmentId == null) return;
        const targetItem = equipList.find((item) => item.id === targetEquipmentId);
        if (!targetItem) return;

        const timer = setTimeout(() => {
            equipmentListRef.current?.scrollToItem({ item: targetItem, animated: true, viewPosition: 0.15 });
            setHighlightedEquipmentId(targetEquipmentId);
        }, 120);

        return () => clearTimeout(timer);
    }, [activeTab, equipLoading, equipList, targetEquipmentId]);

    useEffect(() => {
        if (highlightedEquipmentId == null) return;
        const timer = setTimeout(() => setHighlightedEquipmentId(null), 1800);
        return () => clearTimeout(timer);
    }, [highlightedEquipmentId]);

    // ─── Actions ─────────────────────────────────────────────────────────
    const handleCancel = (id: number) => {
        Alert.alert('Hủy đặt sân', 'Bạn có chắc muốn hủy lịch đặt này không?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Hủy lịch', style: 'destructive',
                onPress: async () => {
                    setActionLoading(id);
                    try {
                        await bookingService.cancelBooking(id);
                        await dispatch(fetchMyBookings());
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể hủy lịch đặt');
                    } finally {
                        setActionLoading(null);
                    }
                },
            },
        ]);
    };

    const handleDelete = (booking: ResBookingDTO, equips: ResBookingEquipmentDTO[]) => {
        if (hasUnreturnedEquipments(equips)) {
            Alert.alert('Chưa thể xóa', 'Bạn cần trả hết thiết bị mượn trước khi xóa lịch sử booking.');
            return;
        }
        Alert.alert('Xóa lịch sử', 'Bạn có muốn xóa lịch đặt này khỏi danh sách không?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    setActionLoading(booking.id);
                    try {
                        await bookingService.deleteBooking(booking.id);
                        await dispatch(fetchMyBookings());
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xóa');
                    } finally {
                        setActionLoading(null);
                    }
                },
            },
        ]);
    };

    const handlePay = (id: number) => {
        navigation.navigate('PaymentQR', { bookingId: id });
    };

    const handleEdit = (bookingId: number, pitchId: number) => {
        navigation.navigate('UpdateBooking', { bookingId, pitchId });
    };

    const handleDeleteEquip = (equip: ResBookingEquipmentDTO) => {
        if (equip.status === 'BORROWED') {
            Alert.alert('Chưa thể xóa', 'Thiết bị này vẫn đang ở trạng thái mượn. Vui lòng trả thiết bị trước.');
            return;
        }
        Alert.alert('Xóa khỏi danh sách', 'Bản ghi sẽ bị xóa khỏi lịch sử của bạn. Admin vẫn lưu trữ.', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    setDeletingEquipId(equip.id);
                    try {
                        await bookingService.deleteBookingEquipment(equip.id);
                        setAllMyEquips(prev => prev.filter(e => e.id !== equip.id));
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xóa');
                    } finally {
                        setDeletingEquipId(null);
                    }
                },
            },
        ]);
    };

    const handleOpenReturn = (equip: ResBookingEquipmentDTO, preset: ReturnPreset) => {
        setReturnModal({ equip, preset });
    };

    const handleOpenEquipmentFromBooking = (equipmentId: number) => {
        setTargetEquipmentId(equipmentId);
        setActiveTab('equipment');
    };

    const handleSubmitReturn = async (data: ReqUpdateBookingEquipmentStatusDTO & { returnNote: string }) => {
        if (!returnModal) return;
        setUpdatingEquipId(returnModal.equip.id);
        try {
            const res = await bookingService.updateEquipmentStatus(returnModal.equip.id, {
                status: data.status,
                quantityReturnedGood: data.quantityReturnedGood,
                quantityLost: data.quantityLost,
                quantityDamaged: data.quantityDamaged,
                returnConditionNote: data.returnConditionNote,
                borrowerSignName: data.borrowerSignName,
                staffSignName: data.staffSignName,
                returnerName: data.returnerName,
                returnerPhone: data.returnerPhone,
                receiverName: data.receiverName,
                receiverPhone: data.receiverPhone,
                returnReportPrintOptIn: data.returnReportPrintOptIn,
            });
            const updated = res.data.data;
            if (updated) {
                setAllMyEquips(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
            }
            setReturnModal(null);
            await dispatch(fetchMyBookings());
        } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message ?? 'Cập nhật trạng thái thất bại');
        } finally {
            setUpdatingEquipId(null);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return <GuestPrompt icon="calendar-outline" title="Lịch đặt sân" subtitle="Đăng nhập để xem và quản lý các lịch đặt sân của bạn" />;
    }

    const renderBookingItem = ({ item }: { item: ResBookingDTO }) => {
        const bookingEquips = equipsByBookingId.get(item.id) ?? [];
        return (
        <BookingCard
            item={item}
            equips={bookingEquips}
            actionLoading={actionLoading}
            onViewDetail={(id) => navigation.navigate('BookingDetail', { bookingId: id })}
            onViewEquipment={handleOpenEquipmentFromBooking}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onPay={handlePay}
        />
        );
    };

    const renderEquipItem = ({ item }: { item: ResBookingEquipmentDTO }) => (
        <EquipmentCard
            item={item}
            deletingId={deletingEquipId}
            updatingId={updatingEquipId}
            isHighlighted={highlightedEquipmentId === item.id}
            onDelete={handleDeleteEquip}
            onViewBooking={(bookingId) => navigation.navigate('BookingDetail', { bookingId })}
            onReturn={handleOpenReturn}
        />
    );

    const currentData = activeTab === 'upcoming' ? upcomingBookings : historyBookings;
    const tabWidth = tabBarWidth > 0 ? tabBarWidth / TABS.length : 0;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right']}>

            {/* Tab bar */}
            <View
                style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
            >
                {TABS.map((tab, i) => {
                    const isActive = activeTab === tab.key;
                    const count = i === 0 ? upcomingBookings.length : i === 1 ? historyBookings.length : equipList.length;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={tab.icon} size={16} color={isActive ? colors.primary : colors.textHint} />
                            <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textHint }, isActive && { fontWeight: FONT_WEIGHT.semibold }]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : colors.textHint }]}>
                                    <Text style={styles.tabBadgeText}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        { backgroundColor: colors.primary, width: tabWidth || undefined },
                        {
                            transform: [{
                                translateX: tabIndicatorAnim.interpolate({
                                    inputRange: [0, 1, 2],
                                    outputRange: [0, tabWidth, tabWidth * 2],
                                }),
                            }],
                        },
                    ]}
                />
            </View>

            {/* Tabs 1 & 2 — Booking lists */}
            {(activeTab === 'upcoming' || activeTab === 'history') && (
                <FlatList
                    data={isLoading && !refreshing ? (Array(4).fill(null) as null[]) : currentData}
                    keyExtractor={(item, idx) => item ? String(item.id) : `skel-${idx}`}
                    renderItem={isLoading && !refreshing ? () => <SkeletonCard /> : renderBookingItem as any}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
                    initialNumToRender={8}
                    maxToRenderPerBatch={10}
                    removeClippedSubviews
                    ListEmptyComponent={
                        !isLoading ? (
                            <EmptyState
                                icon={activeTab === 'upcoming' ? 'football-outline' : 'time-outline'}
                                title={activeTab === 'upcoming' ? 'Không có lịch sắp tới' : 'Chưa có lịch sử'}
                                subtitle={activeTab === 'upcoming' ? 'Hãy đặt sân và bắt đầu đá bóng!' : 'Các lịch đã hoàn thành hoặc bị hủy sẽ hiện ở đây'}
                            />
                        ) : null
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
                />
            )}

            {/* Tab 3 — Equipment */}
            {activeTab === 'equipment' && (
                equipLoading ? (
                    <FlatList
                        data={Array(4).fill(null) as null[]}
                        keyExtractor={(_, i) => `skel-eq-${i}`}
                        renderItem={() => <SkeletonCard />}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
                    />
                ) : (
                    <FlatList
                        ref={equipmentListRef}
                        data={equipList}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderEquipItem}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
                        initialNumToRender={8}
                        maxToRenderPerBatch={10}
                        removeClippedSubviews
                        ListEmptyComponent={
                            <EmptyState icon="construct-outline" title="Chưa có thiết bị mượn" subtitle="Các thiết bị bạn mượn qua hệ thống sẽ hiện ở đây" />
                        }
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
                    />
                )
            )}

            {/* Return Modal */}
            <ReturnModal
                visible={!!returnModal}
                equip={returnModal?.equip ?? null}
                preset={returnModal?.preset ?? 'full'}
                loading={updatingEquipId !== null}
                onClose={() => setReturnModal(null)}
                onSubmit={handleSubmitReturn}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1 },
    listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

    tabBar: { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs },
    tabLabel: { fontSize: FONT_SIZE.xs },
    tabBadge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
    tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: FONT_WEIGHT.bold },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },

    card: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.lg, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    iconWrap: { width: 32, height: 32, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
    statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
    statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
    playingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: SPACING.sm, paddingVertical: 3 },
    playingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
    playingText: { color: '#15803D', fontWeight: FONT_WEIGHT.bold },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs },
    metaText: { fontSize: FONT_SIZE.xs },
    metaDot: { fontSize: FONT_SIZE.xs, marginHorizontal: 2 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    price: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

    expandedWrap: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1 },

    // Info box: label trái – value phải
    infoBox: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginBottom: SPACING.sm },
    detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
    detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    detailLabel: { fontSize: FONT_SIZE.xs },
    detailValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
    copyRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },

    tsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1 },
    tsText: { fontSize: 10 },

    equipSection: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1 },
    equipTitle: { fontSize: FONT_SIZE.xs, marginLeft: 2 },
    equipEmpty: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs, marginLeft: SPACING.lg + 2 },
    equipChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, marginTop: SPACING.xs },
    equipName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, flex: 1 },
    equipQty: { fontSize: FONT_SIZE.xs },
    equipBadge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
    equipBadgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },

    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, minHeight: 34 },
    actionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
    actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, minHeight: 34 },
    actionBtnPrimaryText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: '#fff' },
    infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm },
    infoChipText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

    equipCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
    equipCardHighlight: { borderWidth: 1.5 },
    equipCardHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm },
    equipCardBody: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
    equipStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    equipStat: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
    equipStatVal: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    equipStatLbl: { fontSize: 10, marginTop: 2 },
    equipStatDivider: { width: 1, height: 32 },
    penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm, marginBottom: SPACING.sm },
    penaltyText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: SPACING.xs },
    noteText: { flex: 1, fontSize: FONT_SIZE.xs },
    equipCardFooter: { borderTopWidth: 1, padding: SPACING.md },
    swipeRow: {},
    deleteAction: { width: 84, borderRadius: BORDER_RADIUS.lg, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 },
    deleteActionText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
    swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
    swipeHintText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

    // Return Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1 },
    modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    modalFooter: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.lg, borderTopWidth: 1 },
    modalBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
    modalBtnPrimary: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md },
    equipInfoBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm },
    fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
    qtyRow: { flexDirection: 'row', gap: SPACING.sm },
    qtyInput: { borderWidth: 1.5, borderRadius: BORDER_RADIUS.sm, width: '100%', textAlign: 'center', paddingVertical: SPACING.sm, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    singleLineInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontSize: FONT_SIZE.sm },
    noteInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, fontSize: FONT_SIZE.sm, minHeight: 80, textAlignVertical: 'top' },
});
