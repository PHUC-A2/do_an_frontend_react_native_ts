import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';

interface ScreenHeaderProps {
    title: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, showBack = false, rightAction }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { colors } = useTheme();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                paddingHorizontal: SPACING.lg,
                paddingTop: insets.top + SPACING.sm,
                paddingBottom: SPACING.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            {showBack ? (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: SPACING.xs }}>
                    <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 32 }} />
            )}
            <Text
                style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: FONT_SIZE.lg,
                    fontWeight: FONT_WEIGHT.semibold,
                    color: colors.textPrimary,
                }}
                numberOfLines={1}
            >
                {title}
            </Text>
            <View style={{ width: 32, alignItems: 'flex-end' }}>
                {rightAction ?? <View style={{ width: 32 }} />}
            </View>
        </View>
    );
}

const _unused = {};
