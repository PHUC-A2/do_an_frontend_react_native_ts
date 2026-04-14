import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchNotifications, markReadAsync, markAllReadAsync } from '@redux/slices/notificationSlice';
import EmptyState from '@components/common/EmptyState';
import GuestPrompt from '@components/common/GuestPrompt';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { ResNotificationDTO } from '@/types/notification.types';
import { formatRelative } from '@utils/format/date';
import Button from '@components/common/Button';

export default function NotificationsScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const { notifications, isLoading, unreadCount } = useAppSelector((s) => s.notification);
    const { isAuthenticated } = useAppSelector((s) => s.auth);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchNotifications());
    }, [isAuthenticated]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: unreadCount > 0
                ? () => <Button title="Đọc tất cả" variant="ghost" size="sm" onPress={handleMarkAll} />
                : undefined,
        });
    }, [unreadCount]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchNotifications());
        setRefreshing(false);
    }, []);

    const handleMarkRead = (id: number) => dispatch(markReadAsync(id));
    const handleMarkAll = () => dispatch(markAllReadAsync());

    const renderItem = ({ item }: { item: ResNotificationDTO }) => (
        <TouchableOpacity
            style={[styles.item, !item.isRead && styles.itemUnread]}
            onPress={() => !item.isRead && handleMarkRead(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.iconWrapper}>
                <Ionicons name="notifications" size={20} color={COLORS.primary} />
                {!item.isRead && <View style={styles.dot} />}
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
            </View>
        </TouchableOpacity>
    );

    if (!isAuthenticated) {
        return <GuestPrompt icon="notifications-outline" title="Thông báo" subtitle="Đăng nhập để nhận thông báo về lịch đặt sân và các cập nhật mới nhất" />;
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <EmptyState icon="notifications-outline" title="Không có thông báo nào" />
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    list: { paddingTop: SPACING.sm },
    item: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surface,
        gap: SPACING.md,
    },
    itemUnread: { backgroundColor: COLORS.primaryLight },
    iconWrapper: { position: 'relative', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 18 },
    dot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, backgroundColor: COLORS.danger, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
    content: { flex: 1 },
    title: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
    body: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
    time: { fontSize: FONT_SIZE.xs, color: COLORS.textHint, marginTop: SPACING.xs },
    separator: { height: 1, backgroundColor: COLORS.divider },
});
