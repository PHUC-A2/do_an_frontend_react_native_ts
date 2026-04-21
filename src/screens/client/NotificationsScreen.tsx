import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';

import EmptyState from '@components/common/EmptyState';
import GuestPrompt from '@components/common/GuestPrompt';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@config/theme';
import { ClientStackParamList } from '@navigation/types';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import {
    deleteAllNotificationsAsync,
    deleteNotificationAsync,
    fetchNotifications,
    markAllReadAsync,
    markReadAsync,
} from '@redux/slices/notificationSlice';
import { formatRelative } from '@utils/format/date';
import { NotificationType, ResNotificationDTO } from '@/types/notification.types';

type Nav = NativeStackNavigationProp<ClientStackParamList>;
type NotificationFilter = 'all' | 'unread' | 'read';
const FILTER_TABS: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'read', label: 'Đã đọc' },
];

type NotificationMeta = {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    label: string;
};

const NOTIF_META: Record<NotificationType, NotificationMeta> = {
    BOOKING_CREATED: { icon: 'calendar-outline', color: '#0EA5E9', bg: '#E0F2FE', label: 'Lịch mới' },
    BOOKING_PENDING_CONFIRMATION: { icon: 'time-outline', color: '#F59E0B', bg: '#FEF3C7', label: 'Chờ duyệt' },
    BOOKING_APPROVED: { icon: 'checkmark-circle-outline', color: '#16A34A', bg: '#DCFCE7', label: 'Đã duyệt' },
    BOOKING_REJECTED: { icon: 'close-circle-outline', color: '#EF4444', bg: '#FEE2E2', label: 'Từ chối' },
    BOOKING_CONFIRMED: { icon: 'checkmark-circle', color: '#16A34A', bg: '#DCFCE7', label: 'Đã xác nhận' },
    BOOKING_CANCELLED: { icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2', label: 'Đã hủy' },
    BOOKING_COMPLETED: { icon: 'flag-outline', color: '#3B82F6', bg: '#DBEAFE', label: 'Hoàn tất' },
    EQUIPMENT_BORROWED: { icon: 'construct-outline', color: '#0EA5E9', bg: '#E0F2FE', label: 'Thiết bị' },
    EQUIPMENT_RETURNED: { icon: 'return-up-back-outline', color: '#16A34A', bg: '#DCFCE7', label: 'Thiết bị' },
    EQUIPMENT_LOST: { icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEE2E2', label: 'Thiết bị' },
    EQUIPMENT_DAMAGED: { icon: 'warning-outline', color: '#F97316', bg: '#FFEDD5', label: 'Thiết bị' },
    PAYMENT_REQUESTED: { icon: 'card-outline', color: '#0EA5E9', bg: '#E0F2FE', label: 'Thanh toán' },
    PAYMENT_PROOF_UPLOADED: { icon: 'receipt-outline', color: '#F59E0B', bg: '#FEF3C7', label: 'Thanh toán' },
    PAYMENT_CONFIRMED: { icon: 'wallet-outline', color: '#16A34A', bg: '#DCFCE7', label: 'Thanh toán' },
    PAYMENT_SUCCESS: { icon: 'card', color: '#16A34A', bg: '#DCFCE7', label: 'Thanh toán' },
    PAYMENT_FAILED: { icon: 'card', color: '#EF4444', bg: '#FEE2E2', label: 'Thanh toán' },
    MATCH_REMINDER: { icon: 'alarm-outline', color: '#8B5CF6', bg: '#EDE9FE', label: 'Nhắc lịch' },
    AI_KEY_EXPIRED: { icon: 'key-outline', color: '#F97316', bg: '#FFEDD5', label: 'Hệ thống' },
    REVIEW_REPLY: { icon: 'chatbubble-outline', color: '#F59E0B', bg: '#FEF3C7', label: 'Đánh giá' },
    SYSTEM: { icon: 'notifications-outline', color: '#6B7280', bg: '#F3F4F6', label: 'Hệ thống' },
};

const BOOKING_TYPES = new Set<NotificationType>([
    'BOOKING_CREATED',
    'BOOKING_PENDING_CONFIRMATION',
    'BOOKING_APPROVED',
    'BOOKING_REJECTED',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'BOOKING_COMPLETED',
    'EQUIPMENT_BORROWED',
    'EQUIPMENT_RETURNED',
    'EQUIPMENT_LOST',
    'EQUIPMENT_DAMAGED',
    'MATCH_REMINDER',
]);

const PAYMENT_TYPES = new Set<NotificationType>([
    'PAYMENT_REQUESTED',
    'PAYMENT_PROOF_UPLOADED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
]);

function getDisplayTitle(item: ResNotificationDTO): string {
    return item.title?.trim() || NOTIF_META[item.type]?.label || 'Thông báo';
}

function getDisplayBody(item: ResNotificationDTO): string {
    return item.body?.trim() || item.message?.trim() || 'Bạn có một thông báo mới.';
}

function getSenderLabel(item: ResNotificationDTO): string {
    return item.senderName?.trim() || 'Hệ thống';
}

function getNotificationTarget(item: ResNotificationDTO): { screen: keyof ClientStackParamList; params: any } | null {
    if (item.referenceId) {
        if (BOOKING_TYPES.has(item.type)) return { screen: 'BookingDetail', params: { bookingId: item.referenceId } };
        if (PAYMENT_TYPES.has(item.type)) return { screen: 'PaymentQR', params: { bookingId: item.referenceId } };
    }
    if (BOOKING_TYPES.has(item.type) || PAYMENT_TYPES.has(item.type)) {
        return { screen: 'ClientTabs', params: { screen: 'MyBookings' } };
    }
    if (item.type === 'REVIEW_REPLY') {
        return { screen: 'ClientTabs', params: { screen: 'Profile' } };
    }
    if (item.type === 'SYSTEM' || item.type === 'AI_KEY_EXPIRED') {
        return { screen: 'ClientTabs', params: { screen: 'Notifications' } };
    }
    return { screen: 'ClientTabs', params: { screen: 'Notifications' } };
}

const SkeletonCard = () => {
    const { colors } = useTheme();
    const anim = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.45, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: anim }]}>
            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
                <View style={{ flex: 1, gap: SPACING.sm }}>
                    <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
                    <View style={{ width: '82%', height: 16, borderRadius: 6, backgroundColor: colors.border }} />
                    <View style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
                    <View style={{ width: '58%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
                </View>
            </View>
        </Animated.View>
    );
};

export default function NotificationsScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors, isDark } = useTheme();
    const { notifications, isLoading, unreadCount } = useAppSelector((s) => s.notification);
    const { isAuthenticated } = useAppSelector((s) => s.auth);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
    const [tabBarWidth, setTabBarWidth] = useState(0);
    const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchNotifications());
    }, [dispatch, isAuthenticated]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchNotifications());
        setRefreshing(false);
    }, [dispatch]);

    const visibleNotifications = useMemo(
        () => notifications.filter((item) => !item.deletedByUser),
        [notifications],
    );

    const unreadItems = useMemo(
        () => visibleNotifications.filter((item) => !item.isRead).length,
        [visibleNotifications],
    );

    const readItems = useMemo(
        () => visibleNotifications.filter((item) => item.isRead).length,
        [visibleNotifications],
    );

    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'unread') return visibleNotifications.filter((item) => !item.isRead);
        if (activeFilter === 'read') return visibleNotifications.filter((item) => item.isRead);
        return visibleNotifications;
    }, [activeFilter, visibleNotifications]);

    const tabIndex = FILTER_TABS.findIndex((tab) => tab.key === activeFilter);
    useEffect(() => {
        Animated.spring(tabIndicatorAnim, { toValue: tabIndex, useNativeDriver: true }).start();
    }, [tabIndex, tabIndicatorAnim]);

    const handleDeleteOne = useCallback((id: number) => {
        dispatch(deleteNotificationAsync(id));
    }, [dispatch]);

    const handleDeleteAll = useCallback(() => {
        if (visibleNotifications.length === 0) return;
        Alert.alert(
            'Xóa tất cả thông báo',
            'Bạn có chắc muốn xóa toàn bộ thông báo khỏi lịch sử?',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa tất cả', style: 'destructive', onPress: () => dispatch(deleteAllNotificationsAsync()) },
            ],
        );
    }, [dispatch, visibleNotifications.length]);

    useEffect(() => {
        const canMarkAll = unreadCount > 0;
        const canDeleteAll = visibleNotifications.length > 0;
        navigation.setOptions({
            headerRight: canMarkAll || canDeleteAll
                ? () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: SPACING.sm }}>
                        {canMarkAll ? (
                            <TouchableOpacity
                                onPress={() => dispatch(markAllReadAsync())}
                                activeOpacity={0.75}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                        ) : null}
                        {canDeleteAll ? (
                            <TouchableOpacity
                                onPress={handleDeleteAll}
                                activeOpacity={0.75}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )
                : undefined,
        });
    }, [colors.danger, colors.primary, dispatch, handleDeleteAll, navigation, unreadCount, visibleNotifications.length]);

    const handlePress = useCallback(async (item: ResNotificationDTO) => {
        if (!item.isRead) {
            try {
                await dispatch(markReadAsync(item.id)).unwrap();
            } catch {
                // noop
            }
        }
        const target = getNotificationTarget(item);
        if (target) {
            navigation.navigate(target.screen as any, target.params);
        }
    }, [dispatch, navigation]);

    const renderRightActions = (item: ResNotificationDTO) => (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleDeleteOne(item.id)}
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
        >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.deleteActionText}>Xóa</Text>
        </TouchableOpacity>
    );

    const renderNotification = ({ item }: { item: ResNotificationDTO }) => {
        const meta = NOTIF_META[item.type] ?? NOTIF_META.SYSTEM;
        const target = getNotificationTarget(item);
        const clickable = !!target;
        const cardBg = item.isRead ? colors.surface : colors.primaryLight;
        const cardBorder = item.isRead ? colors.border : `${colors.primary}55`;

        return (
            <View style={styles.swipeRow}>
                <Swipeable
                    overshootRight={false}
                    renderRightActions={() => renderRightActions(item)}
                >
                    <TouchableOpacity
                        activeOpacity={clickable ? 0.82 : 0.95}
                        onPress={() => void handlePress(item)}
                        style={[
                            styles.card,
                            {
                                marginBottom: 0,
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                ...(isDark ? {} : SHADOW.sm),
                            },
                        ]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md }}>
                            <View style={[styles.iconWrap, { backgroundColor: item.isRead ? colors.surfaceVariant : meta.bg }]}>
                                <Ionicons name={meta.icon} size={20} color={item.isRead ? colors.textHint : meta.color} />
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={styles.cardTopRow}>
                                    <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                                        <Text style={[styles.typePillText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                    {!item.isRead ? (
                                        <View style={[styles.unreadPill, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.unreadPillText}>Mới</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <Text style={[styles.sender, { color: colors.textHint }]}>{getSenderLabel(item)}</Text>

                                <Text
                                    style={[
                                        styles.title,
                                        { color: colors.textPrimary, fontWeight: item.isRead ? FONT_WEIGHT.medium : FONT_WEIGHT.bold },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {getDisplayTitle(item)}
                                </Text>

                                <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                                    {getDisplayBody(item)}
                                </Text>

                                <View style={styles.footerRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="time-outline" size={12} color={colors.textHint} />
                                        <Text style={[styles.time, { color: colors.textHint }]}>{formatRelative(item.createdAt)}</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                                        {clickable ? (
                                            <View style={[styles.linkPill, { borderColor: colors.primary }]}>
                                                <Text style={[styles.linkText, { color: colors.primary }]}>Xem chi tiết</Text>
                                                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                                            </View>
                                        ) : null}
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => handleDeleteOne(item.id)}
                                            style={[styles.inlineDeleteButton, { backgroundColor: colors.surfaceVariant }]}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            </View>
        );
    };

    if (!isAuthenticated) {
        return (
            <GuestPrompt
                icon="notifications-outline"
                title="Thông báo"
                subtitle="Đăng nhập để theo dõi lịch đặt sân, thanh toán và các cập nhật mới nhất"
            />
        );
    }

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right']}>
            <View
                style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
            >
                {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    const count = tab.key === 'all' ? visibleNotifications.length : tab.key === 'unread' ? unreadItems : readItems;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => setActiveFilter(tab.key)}
                            activeOpacity={0.75}
                        >
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
                        { backgroundColor: colors.primary, width: tabBarWidth > 0 ? tabBarWidth / FILTER_TABS.length : undefined },
                        {
                            transform: [{
                                translateX: tabIndicatorAnim.interpolate({
                                    inputRange: [0, 1, 2],
                                    outputRange: [
                                        0,
                                        tabBarWidth > 0 ? tabBarWidth / FILTER_TABS.length : 0,
                                        tabBarWidth > 0 ? (tabBarWidth / FILTER_TABS.length) * 2 : 0,
                                    ],
                                }),
                            }],
                        },
                    ]}
                />
            </View>

            <FlatList
                data={isLoading && !refreshing ? (Array(5).fill(null) as null[]) : filteredNotifications}
                keyExtractor={(item, index) => (item ? String(item.id) : `sk-${index}`)}
                renderItem={isLoading && !refreshing ? (() => <SkeletonCard />) : (renderNotification as any)}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="notifications-outline"
                            title="Không có thông báo nào"
                            subtitle={activeFilter === 'unread' ? 'Hiện tại không còn thông báo chưa đọc.' : activeFilter === 'read' ? 'Chưa có thông báo nào trong mục đã đọc.' : 'Bạn sẽ nhận được thông báo khi có cập nhật mới.'}
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
    list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        position: 'relative',
    },
    tabItem: {
        flex: 1,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: SPACING.xs,
    },
    tabLabel: { fontSize: FONT_SIZE.sm },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: FONT_WEIGHT.bold,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        borderRadius: 1,
    },
    swipeRow: {
        marginBottom: SPACING.md,
    },
    card: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        minHeight: 168,
    },
    deleteAction: {
        width: 84,
        borderRadius: BORDER_RADIUS.xl,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    deleteActionText: {
        color: '#fff',
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.bold,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
        marginBottom: 6,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    typePill: {
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    typePillText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
    unreadPill: {
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
    },
    unreadPillText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
    sender: { fontSize: FONT_SIZE.xs, marginBottom: 4 },
    title: { fontSize: FONT_SIZE.md, lineHeight: 20 },
    body: { marginTop: 6, fontSize: FONT_SIZE.sm, lineHeight: 19, minHeight: 57 },
    footerRow: {
        marginTop: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    time: { fontSize: FONT_SIZE.xs },
    linkPill: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    linkText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
    inlineDeleteButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
});
