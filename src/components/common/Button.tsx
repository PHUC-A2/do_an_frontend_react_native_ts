import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@config/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon,
    style,
    textStyle,
    disabled,
    ...rest
}: ButtonProps) {
    const { colors } = useTheme();

    const bgMap: Record<Variant, string> = {
        primary: colors.primary,
        secondary: colors.secondary,
        outline: 'transparent',
        ghost: 'transparent',
        danger: colors.danger,
    };
    const textColorMap: Record<Variant, string> = {
        primary: colors.textInverse,
        secondary: colors.textInverse,
        outline: colors.primary,
        ghost: colors.primary,
        danger: colors.textInverse,
    };
    const sizeMap: Record<Size, { paddingHorizontal: number; paddingVertical: number }> = {
        sm: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
        md: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
        lg: { paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.lg },
    };
    const fontSizeMap: Record<Size, number> = {
        sm: FONT_SIZE.sm,
        md: FONT_SIZE.md,
        lg: FONT_SIZE.lg,
    };
    const iconSize = size === 'lg' ? 20 : size === 'sm' ? 14 : 16;
    const borderStyle = variant === 'outline'
        ? { borderWidth: 1.5, borderColor: colors.primary }
        : {};

    return (
        <TouchableOpacity
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: bgMap[variant],
                    ...sizeMap[size],
                    ...borderStyle,
                },
                fullWidth && { width: '100%' },
                (disabled || loading) && { opacity: 0.6 },
                style,
            ]}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...rest}
        >
            {loading ? (
                <ActivityIndicator color={textColorMap[variant]} size="small" />
            ) : (
                <>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={iconSize}
                            color={textColorMap[variant]}
                            style={{ marginRight: SPACING.xs }}
                        />
                    )}
                    <Text
                        style={[
                            {
                                fontWeight: FONT_WEIGHT.semibold,
                                color: textColorMap[variant],
                                fontSize: fontSizeMap[size],
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}
