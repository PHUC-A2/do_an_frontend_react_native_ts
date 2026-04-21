import React, { useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import {
    fetchNotifications,
    markReadAsync,
    markAllReadAsync,
} from '@redux/slices/notificationSlice';
import EmptyState from '@components/common/EmptyState';
import GuestPrompt from '@components/common/GuestPrompt';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { ResNotificationDTO, NotificationType } from '@/types/notification.types';
import { formatRelative } from '@utils/format/date';
import { ClientStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// ─── Icon + color per notification type ─────────────────────────────────────
const NOTIF_META: Record<NotificationType, { icon: string; color: string; bg: string }> = {
    BOOKING_CONFIRMED: { icon: 'checkmark-circle',    color: '#16A34A', bg: '#DCFCE7' },
    BOOKING_CANCELLED: { icon: 'close-circle',        color: '#EF4444', bg: '#FEE2E2' },
    BOOKING_COMPLETED: { icon: 'flag',                color: '#3B82F6', bg: '#EFF6FF' },
    PAYMENT_SUCCESS:   { icon: 'card',                color: '#16A34A', bg: '#DCFCE7' },
    PAYMENT_FAILED:    { icon: 'card',                color: '#EF4444', bg: '#FEE2E2' },
    REVIEW_REPLY:      { icon: 'chatbubble',          color: '#F59E0B', bg: '#FEF3C7' },
    SYSTEM:            { icon: 'information-circle',  color: '#6B7280', bg: '#F3F4F6' },
};

function getNavigationTarget(notif: ResNotificationDTO): (() => void) | null {
    return null; // referenceId navigation handled in onPress
}

// ─── Skeleton item ────────────────────────────────────────────────────────────
const SkeletonItem = () => {
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
        <Animated.View style={[styles.skeletonWrap, { backgroundColor: colors.surface, opacity: anim }]}>
            <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
            <View style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 13, width: '65%', backgroundColor: colors.border, borderRadius: 4 }} />
                <View style={{ height: 11, width: '90%', backgroundColor: colors.border, borderRadius: 4 }} />
                <View style={{ height: 10, width: '35%', backgroundColor: colors.border, borderRadius: 4 }} />
            </View>
        </Animated.View>
    );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors, isDark } = useTheme();
    const { notifications, isLoading, unreadCount } = useAppSelector((s) => s.notification);
    const { isAuthenticated } = useAppSelector((s) => s.auth);
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchNotifications());
    }, [isAuthenticated, dispatch]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: unreadCount > 0
                ? () => (
                    <TouchableOpacity
                        onPress={() => dispatch(markAllReadAsync())}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: SPACING.sm }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>
                            Đọc tất cả
                        </Text>
                    </TouchableOpacity>
                )
                : undefined,
        });
    }, [unreadCount, colors, navigation, dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchNotifications());
        setRefreshing(false);
    }, [dispatch]);

    const handlePress = (item: ResNotificationDTO) => {
        if (!item.isRead) dispatch(markReadAsync(item.id));
        if (item.referenceId) {
            const t = item.type;
            if (
                t === 'BOOKING_CONFIRMED' ||
                t === 'BOOKING_CANCELLED' ||
                t === 'BOOKING_COMPLETED'
            ) {
                navigation.navigate('BookingDetail', { bookingId: item.referenceId });
            } else if (t === 'PAYMENT_SUCCESS' || t === 'PAYMENT_FAILED') {
                navigation.navigate('PaymentQR', { bookingId: item.referenceId });
            }
        }
    };

    const renderItem = ({ item, index }: { item: ResNotificationDTO; index: number }) => {
        const meta = NOTIF_META[item.type] ?? NOTIF_META.SYSTEM;
        const isNavigable = !!item.referenceId;

        return (
            <TouchableOpacity
                activeOpacity={isNavigable ? 0.75 : 0.9}
                onPress={() => handlePress(item)}
                style={[
                    styles.item,
                    {
                        backgroundColor: item.isRead ? colors.surface : colors.primaryLight,
                        borderBottomColor: colors.divider,
                    },
                ]}
            >
                {/* Unread dot */}
                {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}

                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: item.isRead ? colors.surfaceVariant : meta.bg }]}>
                    <Ionicons
                        name={meta.icon as any}
                        size={20}
                        color={item.isRead ? colors.textHint : meta.color}
                    />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={[
                            styles.title,
                            {
                                color: colors.textPrimary,
                                fontWeight: item.isRead ? FONT_WEIGHT.regular : FONT_WEIGHT.semibold,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text
                        style={[styles.body, { color: colors.textSecondary }]}
                        numberOfLines={2}
                    >
                        {item.body}
                    </Text>
                    <View style={styles.footerRow}>
                        <Text style={[styles.time, { color: colors.textHint }]}>
                            {formatRelative(item.createdAt)}
                        </Text>
                        {isNavigable && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary }}>Xem chi tiết</Text>
                                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!isAuthenticated) {
        return (
            <GuestPrompt
                icon="notifications-outline"
                title="Thông báo"
                subtitle="Đăng nhập để nhận thông báo về lịch đặt sân và các cập nhật mới nhất"
            />
        );
    }

    const shadowStyle = isDark ? {} : SHADOW.sm;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right']}>
            {/* Summary bar */}
            {unreadCount > 0 && (
                <View style={[styles.summaryBar, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="ellipse" size={8} color={colors.primary} />
                    <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>
                        {unreadCount} thông báo chưa đọc
                    </Text>
                </View>
            )}

            <FlatList
                data={isLoading && !refreshing ? (Array(6).fill(null) as null[]) : notifications}
                keyExtractor={(item, idx) => item ? String(item.id) : `sk-${idx}`}
                renderItem={
                    isLoading && !refreshing
                        ? () => <SkeletonItem />
                        : renderItem as any
                }
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="notifications-outline"
                            title="Không có thông báo nào"
                            subtitle="Bạn sẽ nhận được thông báo khi có cập nhật về lịch đặt sân"
                        />
                    ) : null
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    list: { paddingBottom: SPACING.xl },
    summaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
    },
    item: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        alignItems: 'flex-start',
        gap: SPACING.md,
        borderBottomWidth: 1,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        left: 6,
        top: '50%',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: { fontSize: FONT_SIZE.md, marginBottom: 2 },
    body: { fontSize: FONT_SIZE.sm, lineHeight: 18, marginBottom: SPACING.xs },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    time: { fontSize: FONT_SIZE.xs },
    // Skeleton
    skeletonWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    skeletonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        flexShrink: 0,
    },
});
