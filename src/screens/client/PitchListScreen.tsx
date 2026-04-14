import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchPitches } from '@redux/slices/pitchSlice';
import { ClientStackParamList } from '@navigation/types';
import PitchCard from '@components/common/PitchCard';
import SkeletonPitchCard from '@components/common/SkeletonPitchCard';
import EmptyState from '@components/common/EmptyState';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { ResPitchDTO } from '@/types/pitch.types';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const SKELETON_COUNT = 4;

export default function PitchListScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<Nav>();
    const { colors } = useTheme();
    const { pitches, isLoading, error } = useAppSelector((s) => s.pitch);

    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    // Animated border width for search focus
    const borderAnim = useRef(new Animated.Value(1)).current;
    const borderColorAnim = useRef(new Animated.Value(0)).current;

    const searchBorderStyle = {
        borderWidth: borderAnim,
        borderColor: borderColorAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.border, colors.primary],
        }),
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(borderAnim, {
                toValue: searchFocused ? 2 : 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }),
            Animated.timing(borderColorAnim, {
                toValue: searchFocused ? 1 : 0,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }),
        ]).start();
    }, [searchFocused]);

    useEffect(() => {
        dispatch(fetchPitches({ page: 1, size: 20 }));
    }, []);

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
        await dispatch(fetchPitches({ page: 1, size: 20 }));
        setRefreshing(false);
    }, []);

    const filtered: ResPitchDTO[] = query.trim()
        ? pitches.filter(
            (p) =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.address.toLowerCase().includes(query.toLowerCase()),
        )
        : pitches;

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
                onPress={() => dispatch(fetchPitches({ page: 1, size: 20 }))}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            {/* Search Bar */}
            <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Animated.View
                    style={[
                        {
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.background,
                            borderRadius: BORDER_RADIUS.full,
                            paddingHorizontal: SPACING.lg,
                            paddingVertical: SPACING.sm,
                            gap: SPACING.sm,
                        },
                        searchBorderStyle,
                    ]}
                >
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color={searchFocused ? colors.primary : colors.textHint}
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            fontSize: FONT_SIZE.md,
                            color: colors.textPrimary,
                            paddingVertical: 0,
                        }}
                        placeholder="Tìm kiếm sân..."
                        placeholderTextColor={colors.textHint}
                        value={query}
                        onChangeText={setQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={18} color={colors.textHint} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            {/* Content */}
            {isLoading && pitches.length === 0 ? (
                renderSkeletons()
            ) : error && pitches.length === 0 ? (
                renderError()
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{
                        padding: SPACING.lg,
                        paddingBottom: SPACING.xxxl,
                        flexGrow: 1,
                    }}
                    initialNumToRender={6}
                    maxToRenderPerBatch={8}
                    windowSize={10}
                    removeClippedSubviews={true}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <EmptyState
                            icon="football-outline"
                            title={query ? 'Không tìm thấy sân' : 'Không có sân nào'}
                            subtitle={query ? `Không có kết quả cho "${query}"` : 'Hiện chưa có sân bóng nào'}
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
