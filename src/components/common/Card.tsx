import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, SHADOW, SPACING } from '@config/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    padded?: boolean;
}

export default function Card({ children, style, padded = true }: CardProps) {
    const { colors, isDark } = useTheme();
    return (
        <View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderRadius: BORDER_RADIUS.lg,
                    ...(isDark ? {} : SHADOW.md),
                    ...(isDark ? { borderWidth: 1, borderColor: colors.border } : {}),
                },
                padded && { padding: SPACING.lg },
                style,
            ]}
        >
            {children}
        </View>
    );
}
