import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientScreenProps } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOW } from '@config/theme';
import { bookingService } from '@services/booking.service';
import { pitchService } from '@services/pitch.service';
import { ResPitchDTO } from '@/types/pitch.types';
import { formatVND } from '@utils/format/currency';

type Props = ClientScreenProps<'CreateBooking'>;

function formatDateTime(iso: string): string {
    // "2026-04-11T06:00:00" → "06:00 11/04/2026"
    const [date, time] = iso.split('T');
    const [y, m, d] = date.split('-');
    return `${time.slice(0, 5)} ngày ${d}/${m}/${y}`;
}

function durationLabel(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const mins = (e.getTime() - s.getTime()) / 60000;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'p' : ''}` : `${m}p`;
}

export default function CreateBookingScreen({ route, navigation }: Props) {
    const { pitchId, startTime, endTime } = route.params;
    const { colors, isDark } = useTheme();

    const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingPitch, setFetchingPitch] = useState(true);

    useEffect(() => {
        pitchService.getPitchById(pitchId)
            .then(r => setPitch(r.data.data ?? null))
            .catch(() => { })
            .finally(() => setFetchingPitch(false));
    }, [pitchId]);

    const handleBook = useCallback(async () => {
        setLoading(true);
        try {
            const res = await bookingService.createBooking({ pitchId, startDateTime: startTime, endDateTime: endTime });
            const booking = res.data.data!;
            Alert.alert(
                'Đặt sân thành công',
                `Yêu cầu đặt sân đã được gửi. Chờ admin xác nhận.`,
                [{
                    text: 'Xem đặt sân',
                    onPress: () => navigation.replace('BookingDetail', { bookingId: booking.id }),
                }],
            );
        } catch (err: any) {
            Alert.alert('Đặt sân thất bại', err?.response?.data?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [pitchId, startTime, endTime, note]);

    const shadowStyle = isDark ? {} : SHADOW.md;

    const InfoRow = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ width: 34, height: 34, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
                <Ionicons name={icon} size={17} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>{label}</Text>
            <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'right', flex: 1.2 }}>{value}</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>

            <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

                {/* Pitch info card */}
                <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: colors.border, ...shadowStyle }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm }}>
                        Thông tin sân
                    </Text>
                    {fetchingPitch ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : pitch ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                            <View style={{ width: 48, height: 48, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="football" size={24} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{pitch.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Ionicons name="location-outline" size={13} color={colors.textHint} />
                                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>{pitch.address}</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZE.sm }}>Sân #{pitchId}</Text>
                    )}
                </View>

                {/* Booking summary card */}
                <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: colors.border, ...shadowStyle }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.medium, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: SPACING.lg, marginBottom: SPACING.xs }}>
                        Chi tiết lịch đặt
                    </Text>
                    <InfoRow icon="time-outline" label="Bắt đầu" value={formatDateTime(startTime)} />
                    <InfoRow icon="time-outline" label="Kết thúc" value={formatDateTime(endTime)} />
                    <InfoRow icon="hourglass-outline" label="Thời lượng" value={durationLabel(startTime, endTime)} />
                    <View style={{ paddingVertical: SPACING.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 34, height: 34, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
                                <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
                            </View>
                            <Text style={{ flex: 1, fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Trạng thái</Text>
                            <View style={{ backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 3 }}>
                                <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: '#F59E0B' }}>Chờ duyệt</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Note */}
                <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: colors.border, ...shadowStyle }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, fontWeight: FONT_WEIGHT.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.md }}>
                        Ghi chú (tuỳ chọn)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border, padding: SPACING.md }}>
                        <Ionicons name="create-outline" size={18} color={colors.textHint} style={{ marginTop: 2 }} />
                        <TextInput
                            style={{ flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, minHeight: 72, textAlignVertical: 'top' }}
                            placeholder="Nhập ghi chú cho admin (ví dụ: mang theo áo, số người...)"
                            placeholderTextColor={colors.textHint}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            maxLength={300}
                        />
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textHint, textAlign: 'right', marginTop: 4 }}>{note.length}/300</Text>
                </View>

                {/* Policy note */}
                <View style={{ flexDirection: 'row', gap: SPACING.sm, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.md, padding: SPACING.md }}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: FONT_SIZE.xs, color: colors.textSecondary, lineHeight: 18 }}>
                        Yêu cầu sẽ được gửi đến admin để xác nhận. Sau khi xác nhận bạn có thể thanh toán để hoàn tất đặt sân.
                    </Text>
                </View>
            </ScrollView>

            {/* CTA */}
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
                            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#fff' }}>
                                Gửi yêu cầu đặt sân
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
