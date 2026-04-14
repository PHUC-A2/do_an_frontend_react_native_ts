import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';
import { ClientStackParamList } from '@navigation/types';
import EmptyState from '@components/common/EmptyState';
import GuestPrompt from '@components/common/GuestPrompt';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { ResBookingDTO } from '@/types/booking.types';
import { BOOKING_STATUS_LABEL } from '@utils/constants';
import { formatDateTime } from '@utils/format/date';
import { formatVND } from '@utils/format/currency';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const STATUS_COLOR: Record<string, string> = {
    PENDING: '#ff9800',
    CONFIRMED: '#34a853',
    CHECKIN: '#1a73e8',
    COMPLETED: '#5f6368',
    CANCELLED: '#ea4335',
    NO_SHOW: '#9c27b0',
};

export default function MyBookingsScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { myBookings, isLoading } = useAppSelector((s) => s.booking);
    const { isAuthenticated } = useAppSelector((s) => s.auth);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchMyBookings());
    }, [isAuthenticated]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchMyBookings());
        setRefreshing(false);
    }, []);

    const renderItem = ({ item }: { item: ResBookingDTO }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
            activeOpacity={0.85}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.pitchName} numberOfLines={1}>{item.pitchName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                        {BOOKING_STATUS_LABEL[item.status]}
                    </Text>
                </View>
            </View>
            <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textHint} />
                <Text style={styles.metaText}>
                    {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}
                </Text>
            </View>
            <View style={styles.footer}>
                <Text style={styles.price}>{formatVND(item.totalPrice)}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textHint} />
            </View>
        </TouchableOpacity>
    );

    if (!isAuthenticated) {
        return <GuestPrompt icon="calendar-outline" title="Xem lịch đặt sân" subtitle="Đăng nhập để xem và quản lý các lịch đặt sân của bạn" />;
    }

    return (
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
            <FlatList
                data={myBookings}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
                ListEmptyComponent={
                    <EmptyState icon="calendar-outline" title="Chưa có lịch đặt nào" subtitle="Hãy đặt sân đầu tiên của bạn!" />
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: SPACING.xl },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    pitchName: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.semibold,
        color: COLORS.textPrimary,
        marginRight: SPACING.sm,
    },
    statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
    statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
    metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
});
