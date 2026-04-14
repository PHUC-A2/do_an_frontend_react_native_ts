import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@services/api';
import { ENDPOINTS } from '@config/api.config';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { formatVND } from '@utils/format/currency';

interface Overview {
    totalUsers: number;
    totalBookings: number;
    totalRevenue: number;
    totalPitches: number;
    pendingBookings: number;
    todayBookings: number;
}

export default function DashboardScreen() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-overview'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.DASHBOARD.OVERVIEW);
            return res.data.data as Overview;
        },
    });

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tổng quan</Text>
                <Text style={styles.headerSub}>TUB Sport Admin</Text>
            </View>
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.grid}>
                        <StatCard icon="people" label="Người dùng" value={String(data?.totalUsers ?? 0)} color={COLORS.primary} bg={COLORS.primaryLight} />
                        <StatCard icon="calendar" label="Đặt sân" value={String(data?.totalBookings ?? 0)} color={COLORS.secondary} bg="#e6f4ea" />
                        <StatCard icon="cash" label="Doanh thu" value={formatVND(data?.totalRevenue ?? 0)} color="#fbbc04" bg="#fef7e0" />
                        <StatCard icon="football" label="Sân bóng" value={String(data?.totalPitches ?? 0)} color={COLORS.info} bg="#e3f2fd" />
                    </View>
                    <View style={styles.grid}>
                        <StatCard icon="hourglass-outline" label="Chờ xác nhận" value={String(data?.pendingBookings ?? 0)} color={COLORS.warning} bg="#fff3e0" />
                        <StatCard icon="today-outline" label="Hôm nay" value={String(data?.todayBookings ?? 0)} color={COLORS.danger} bg="#fce8e6" />
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
    return (
        <View style={[styles.statCard, { flex: 1 }]}>
            <View style={[styles.statIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.primary,
    },
    headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
    headerSub: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: SPACING.xl, gap: SPACING.md },
    grid: { flexDirection: 'row', gap: SPACING.md },
    statCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOW.sm,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
    statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
});
