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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
        onSubmit({
            status: presetMeta.status,
            quantityReturnedGood: parseInt(qtyGood) || 0,
            quantityLost: parseInt(qtyLost) || 0,
            quantityDamaged: parseInt(qtyDamaged) || 0,
            returnConditionNote: returnNote.trim() || undefined,
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
                                    Ghi chú tình trạng khi trả (tuỳ chọn)
                                </Text>
                                <TextInput
                                    style={[styles.noteInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                                    value={returnNote}
                                    onChangeText={setReturnNote}
                                    placeholder="Nhập ghi chú..."
                                    placeholderTextColor={colors.textHint}
                                    multiline
                                    numberOfLines={3}
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
    onEdit: (id: number, pitchId: number) => void;
    onCancel: (id: number) => void;
    onDelete: (id: number) => void;
    onPay: (id: number) => void;
}

const BookingCard = React.memo(({
    item, equips, actionLoading, onViewDetail, onEdit, onCancel, onDelete, onPay,
}: BookingCardProps) => {
    const { colors, isDark } = useTheme();
    const [expanded, setExpanded] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim  = useRef(new Animated.Value(1)).current;

    const now = new Date();
    const isEnded    = new Date(item.endDateTime) < now;
    const isPending  = item.status === 'PENDING';
    const isActive   = item.status === 'ACTIVE' || item.status === 'CONFIRMED';
    const isPaid     = item.status === 'PAID';
    const isCancelled = item.status === 'CANCELLED';

    const canPay    = isActive && !isEnded;
    const canUpdate = (isActive || isPending) && !isEnded && !isPaid;
    const canCancel = (isActive || isPending) && !isEnded && !isPaid;
    const canDelete = isPaid || isCancelled || isEnded;

    const statusMeta = getStatusColor(item.status);
    const isBusy = actionLoading === item.id;

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
                        <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.statusText, { color: statusMeta.text }]}>
                                {BOOKING_STATUS_LABEL[item.status] ?? item.status}
                            </Text>
                        </View>
                        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
                            <Ionicons name="chevron-down" size={16} color={colors.textHint} />
                        </Animated.View>
                    </View>
                </View>

                {/* Time */}
                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textHint} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
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

                        {/* Người đặt */}
                        <View style={styles.detailRow}>
                            <Ionicons name="person-outline" size={14} color={colors.textHint} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Người đặt:</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.userName}</Text>
                        </View>

                        {/* Liên hệ */}
                        {item.contactPhone ? (
                            <View style={styles.detailRow}>
                                <Ionicons name="call-outline" size={14} color={colors.textHint} />
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Liên hệ:</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.contactPhone}</Text>
                            </View>
                        ) : null}

                        {/* Thời lượng */}
                        <View style={styles.detailRow}>
                            <Ionicons name="hourglass-outline" size={14} color={colors.textHint} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Thời lượng:</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {durationLabel(item.startDateTime, item.endDateTime, item.durationMinutes)}
                            </Text>
                        </View>

                        {/* Tổng tiền */}
                        <View style={[styles.detailRow, { marginTop: 2 }]}>
                            <Ionicons name="cash-outline" size={14} color={colors.textHint} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tổng tiền:</Text>
                            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md }]}>
                                {formatVND(item.totalPrice)}
                            </Text>
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
                                        <View key={eq.id} style={[styles.equipChip, { backgroundColor: colors.surfaceVariant }]}>
                                            <Text style={[styles.equipName, { color: colors.textPrimary }]}>{eq.equipmentName}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                                                <Text style={[styles.equipQty, { color: colors.textSecondary }]}>SL: {eq.quantity}</Text>
                                                <View style={[styles.equipBadge, { backgroundColor: meta.bgColor }]}>
                                                    <Text style={[styles.equipBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                                </View>
                                            </View>
                                        </View>
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
                                    onPress={() => onDelete(item.id)}
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

                            {isPaid && (
                                <View style={[styles.infoChip, { backgroundColor: '#DCFCE7' }]}>
                                    <Ionicons name="checkmark-circle-outline" size={12} color="#16A34A" />
                                    <Text style={[styles.infoChipText, { color: '#16A34A' }]}>Đã thanh toán</Text>
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
    onDelete: (id: number) => void;
    onReturn: (item: ResBookingEquipmentDTO, preset: ReturnPreset) => void;
}

const EquipmentCard = React.memo(({ item, deletingId, updatingId, onDelete, onReturn }: EquipmentCardProps) => {
    const { colors, isDark } = useTheme();
    const meta = BOOKING_EQUIPMENT_STATUS_META[item.status];
    const isDeleting = deletingId === item.id;
    const isUpdating = updatingId === item.id;
    const shadowStyle = isDark ? {} : SHADOW.sm;

    return (
        <View style={[styles.equipCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
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
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => onDelete(item.id)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color={colors.textHint} />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={13} color={colors.textHint} />
                                <Text style={[styles.actionBtnText, { color: colors.textHint }]}>Xóa khỏi danh sách</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
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

    const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
    const [refreshing, setRefreshing] = useState(false);

    // All my equipments (used by both tabs 1/2 inline + tab 3)
    const [allMyEquips, setAllMyEquips] = useState<ResBookingEquipmentDTO[]>([]);
    const [equipLoading, setEquipLoading] = useState(false);

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
            (isEnded || b.status === 'CANCELLED') ? history.push(b) : upcoming.push(b);
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

    const handleDelete = (id: number) => {
        Alert.alert('Xóa lịch sử', 'Bạn có muốn xóa lịch đặt này khỏi danh sách không?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    setActionLoading(id);
                    try {
                        await bookingService.deleteBooking(id);
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
        navigation.navigate('BookingDetail', { bookingId: id });
    };

    const handleEdit = (_bookingId: number, pitchId: number) => {
        navigation.navigate('BookingTimeline', { pitchId });
    };

    const handleDeleteEquip = (id: number) => {
        Alert.alert('Xóa khỏi danh sách', 'Bản ghi sẽ bị xóa khỏi lịch sử của bạn. Admin vẫn lưu trữ.', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    setDeletingEquipId(id);
                    try {
                        await bookingService.deleteBookingEquipment(id);
                        setAllMyEquips(prev => prev.filter(e => e.id !== id));
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

    const renderBookingItem = ({ item }: { item: ResBookingDTO }) => (
        <BookingCard
            item={item}
            equips={equipsByBookingId.get(item.id) ?? []}
            actionLoading={actionLoading}
            onViewDetail={(id) => navigation.navigate('BookingDetail', { bookingId: id })}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onPay={handlePay}
        />
    );

    const renderEquipItem = ({ item }: { item: ResBookingEquipmentDTO }) => (
        <EquipmentCard
            item={item}
            deletingId={deletingEquipId}
            updatingId={updatingEquipId}
            onDelete={handleDeleteEquip}
            onReturn={handleOpenReturn}
        />
    );

    const currentData = activeTab === 'upcoming' ? upcomingBookings : historyBookings;
    const TAB_W = 100 / TABS.length;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right']}>

            {/* Tab bar */}
            <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
                        { backgroundColor: colors.primary, width: `${TAB_W}%` },
                        {
                            transform: [{
                                translateX: tabIndicatorAnim.interpolate({
                                    inputRange: [0, 1, 2],
                                    outputRange: [0, 100, 200],
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
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs },
    metaText: { fontSize: FONT_SIZE.xs },
    metaDot: { fontSize: FONT_SIZE.xs, marginHorizontal: 2 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    price: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

    expandedWrap: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
    detailLabel: { fontSize: FONT_SIZE.xs, width: 84 },
    detailValue: { flex: 1, fontSize: FONT_SIZE.xs },
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
    noteInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, fontSize: FONT_SIZE.sm, minHeight: 80, textAlignVertical: 'top' },
});
