import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, SPACING } from '@config/theme';

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
}

export default function EmptyState({
    icon = 'file-tray-outline',
    title,
    subtitle,
}: EmptyStateProps) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.section }}>
            <Ionicons name={icon} size={56} color={colors.textHint} />
            <Text style={{ marginTop: SPACING.lg, fontSize: FONT_SIZE.lg, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' }}>
                {title}
            </Text>
            {subtitle && (
                <Text style={{ marginTop: SPACING.sm, fontSize: FONT_SIZE.md, color: colors.textHint, textAlign: 'center' }}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}
