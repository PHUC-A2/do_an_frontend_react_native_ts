import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@config/ThemeContext';
import { useAuth } from '@hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { setPitchSearchKeyword } from '@redux/slices/pitchSearchSlice';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';
import Avatar from '@components/common/Avatar';

interface ClientTopHeaderProps {
    title: string;
    showBack?: boolean;
}

export default function ClientTopHeader({ title, showBack = false }: ClientTopHeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const { colors, isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const unreadCount = useAppSelector((s) => s.notification.unreadCount);
    const globalKeyword = useAppSelector((s) => s.pitchSearch.keyword);
    const avatarFallbackName = (user?.email?.trim()?.[0] ?? 'G').toUpperCase();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState(globalKeyword);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchExpandAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef<TextInput>(null);

    useEffect(() => {
        setSearchValue(globalKeyword);
    }, [globalKeyword]);

    useEffect(() => {
        Animated.timing(searchExpandAnim, {
            toValue: searchOpen ? 1 : 0,
            duration: 240,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start(() => {
            if (searchOpen) {
                searchInputRef.current?.focus();
            }
        });
    }, [searchOpen]);

    const searchBarHeight = searchExpandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 46],
    });
    const searchBarTranslateY = searchExpandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-6, 0],
    });

    const submitSearch = () => {
        dispatch(setPitchSearchKeyword(searchValue.trim()));
        setSearchOpen(false);
        navigation.navigate('Pitches');
    };

    return (
        <View
            style={{
                backgroundColor: colors.surface,
                paddingTop: insets.top + SPACING.sm,
                paddingHorizontal: SPACING.xl,
                paddingBottom: SPACING.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {showBack ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: SPACING.xs }} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary }}>Xin chào</Text>
                        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>{user?.name ?? 'Bạn'}</Text>
                    </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <TouchableOpacity
                        style={{ padding: SPACING.xs }}
                        onPress={() => {
                            if (!searchOpen) {
                                setSearchOpen(true);
                                return;
                            }
                            if (!searchFocused && searchValue.trim().length === 0) {
                                setSearchOpen(false);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ position: 'relative', padding: SPACING.xs }}
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                        {unreadCount > 0 && (
                            <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: SPACING.xs }} onPress={toggleTheme} activeOpacity={0.7}>
                        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: SPACING.xs }} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
                        <Avatar uri={user?.avatar} name={avatarFallbackName} size={28} />
                    </TouchableOpacity>
                </View>
            </View>
            <Animated.View
                style={{
                    height: searchBarHeight,
                    opacity: searchExpandAnim,
                    overflow: 'hidden',
                    marginTop: searchOpen ? SPACING.sm : 0,
                    transform: [{ translateY: searchBarTranslateY }],
                }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surface,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: SPACING.md,
                        gap: SPACING.sm,
                        height: 42,
                    }}
                >
                    <Ionicons name="search-outline" size={18} color={colors.textHint} />
                    <TextInput
                        ref={searchInputRef}
                        value={searchValue}
                        onChangeText={setSearchValue}
                        onSubmitEditing={submitSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => {
                            setSearchFocused(false);
                            if (searchValue.trim().length === 0) {
                                setSearchOpen(false);
                            }
                        }}
                        returnKeyType="search"
                        placeholder="Tìm kiếm sân..."
                        placeholderTextColor={colors.textHint}
                        style={{
                            flex: 1,
                            fontSize: FONT_SIZE.md,
                            color: colors.textPrimary,
                            paddingVertical: 0,
                        }}
                    />
                    {searchValue.length > 0 ? (
                        <TouchableOpacity onPress={() => setSearchValue('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={18} color={colors.textHint} />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={submitSearch} activeOpacity={0.7}>
                        <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}
