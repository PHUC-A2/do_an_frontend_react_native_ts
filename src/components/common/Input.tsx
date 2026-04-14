import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, SPACING } from '@config/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
    isPassword?: boolean;
}

export default function Input({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    isPassword,
    secureTextEntry,
    ...rest
}: InputProps) {
    const { colors } = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    const isSecure = isPassword ? !showPassword : secureTextEntry;
    const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

    return (
        <View style={[{ marginBottom: SPACING.md }, containerStyle]}>
            {label && (
                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs, fontWeight: '500' }}>
                    {label}
                </Text>
            )}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: colors.surface,
                    paddingHorizontal: SPACING.md,
                    borderColor,
                }}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={18}
                        color={focused ? colors.primary : colors.textSecondary}
                        style={{ marginRight: SPACING.sm }}
                    />
                )}
                <TextInput
                    style={{
                        flex: 1,
                        paddingVertical: SPACING.md,
                        fontSize: FONT_SIZE.md,
                        color: colors.textPrimary,
                    }}
                    placeholderTextColor={colors.textHint}
                    secureTextEntry={isSecure}
                    autoCapitalize="none"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...rest}
                />
                {isPassword && (
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={{ paddingLeft: SPACING.sm }}>
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
                {!isPassword && rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} style={{ paddingLeft: SPACING.sm }}>
                        <Ionicons name={rightIcon} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            {error && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.danger, marginTop: SPACING.xs }}>
                    {error}
                </Text>
            )}
        </View>
    );
}
