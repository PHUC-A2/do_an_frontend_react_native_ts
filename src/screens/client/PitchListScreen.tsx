import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchPitches } from '@redux/slices/pitchSlice';
import { RootState } from '@redux/store';
import { ClientStackParamList } from '@navigation/types';
import PitchCard from '@components/common/PitchCard';
import SkeletonPitchCard from '@components/common/SkeletonPitchCard';
import EmptyState from '@components/common/EmptyState';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { ResPitchDTO } from '@/types/pitch.types';
import { CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, CLIENT_SCROLL_TO_TOP_EVENT } from '@components/common/chat/chat.constants';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const SKELETON_COUNT = 4;

export default function PitchListScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors } = useTheme();
    const { pitches, isLoading, error } = useAppSelector((s: RootState) => s.pitch);
    const keyword = useAppSelector((s: RootState) => s.pitchSearch.keyword);
    const listRef = useRef<FlatList<ResPitchDTO>>(null);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        dispatch(fetchPitches({ page: 1, size: 20, keyword: keyword.trim() || undefined }));
    }, [dispatch, keyword]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, marginRight: SPACING.sm, alignItems: 'center', justifyContent: 'center', minWidth: 56, flexShrink: 0 }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: FONT_WEIGHT.semibold, flexShrink: 0 }}>{pitches.length} sân</Text>
                </View>
            ),
        });
    }, [pitches.length]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchPitches({ page: 1, size: 20, keyword: keyword.trim() || undefined }));
        setRefreshing(false);
    }, [dispatch, keyword]);

    const updateBackToTopVisibility = (scrollY: number) => {
        const canScroll = contentHeightRef.current > layoutHeightRef.current + 12;
        const visible = canScroll && scrollY > 120;
        DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, visible);
    };

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(CLIENT_SCROLL_TO_TOP_EVENT, () => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
        return () => {
            subscription.remove();
            DeviceEventEmitter.emit(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, false);
        };
    }, []);

    const renderItem = ({ item, index }: { item: ResPitchDTO; index: number }) => (
        <PitchCard
            item={item}
            index={index}
            onPress={() => navigation.navigate('PitchDetail', { pitchId: item.id })}
            onBook={() => navigation.navigate('BookingTimeline', { pitchId: item.id })}
        />
    );

    const renderSkeletons = () => (
        <View style={{ padding: SPACING.lg }}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonPitchCard key={i} />
            ))}
        </View>
    );

    const renderError = () => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl, gap: SPACING.lg }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
            </View>
            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'center' }}>
                Không thể tải dữ liệu
            </Text>
            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, textAlign: 'center' }}>
                {error ?? 'Đã xảy ra lỗi, vui lòng thử lại'}
            </Text>
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    backgroundColor: colors.primary,
                    paddingHorizontal: SPACING.xxl,
                    paddingVertical: SPACING.md,
                    borderRadius: BORDER_RADIUS.md,
                    minHeight: 44,
                }}
                onPress={() => dispatch(fetchPitches({ page: 1, size: 20, keyword: keyword.trim() || undefined }))}
                activeOpacity={0.85}
            >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: '#fff' }}>
                    Thử lại
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
            {/* Content */}
            {isLoading && pitches.length === 0 ? (
                renderSkeletons()
            ) : error && pitches.length === 0 ? (
                renderError()
            ) : (
                <FlatList
                    ref={listRef}
                    data={pitches}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{
                        padding: SPACING.lg,
                        flexGrow: 1,
                    }}
                    initialNumToRender={6}
                    maxToRenderPerBatch={8}
                    windowSize={10}
                    removeClippedSubviews={true}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onLayout={(event) => {
                        layoutHeightRef.current = event.nativeEvent.layout.height;
                        updateBackToTopVisibility(0);
                    }}
                    onContentSizeChange={(_, h) => {
                        contentHeightRef.current = h;
                        updateBackToTopVisibility(0);
                    }}
                    onScroll={(event) => {
                        updateBackToTopVisibility(event.nativeEvent.contentOffset.y);
                    }}
                    ListEmptyComponent={
                        <EmptyState
                            icon="football-outline"
                            title="Không có sân nào"
                            subtitle="Hiện chưa có sân bóng nào"
                        />
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
            )}
        </SafeAreaView>
    );
}
