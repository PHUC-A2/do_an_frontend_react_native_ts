import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ClientStackParamList } from '@navigation/types';
import Button from './Button';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';

interface GuestPromptProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title?: string;
    subtitle?: string;
}

type Nav = NativeStackNavigationProp<ClientStackParamList>;

export default function GuestPrompt({
    icon = 'lock-closed-outline',
    title = 'Bạn chưa đăng nhập',
    subtitle = 'Đăng nhập để sử dụng tính năng này',
}: GuestPromptProps) {
    const navigation = useNavigation<Nav>();
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxxl, backgroundColor: colors.background }}>
            <View style={{
                width: 96, height: 96, borderRadius: BORDER_RADIUS.xl,
                backgroundColor: colors.primaryLight, alignItems: 'center',
                justifyContent: 'center', marginBottom: SPACING.xl,
            }}>
                <Ionicons name={icon} size={48} color={colors.primary} />
            </View>
            <Text style={{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' }}>
                {title}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxxl }}>
                {subtitle}
            </Text>
            <Button
                title="Đăng nhập"
                icon="log-in-outline"
                onPress={() => navigation.navigate('AuthModal')}
                style={{ width: '100%', marginBottom: SPACING.md }}
            />
            <Button
                title="Đăng ký tài khoản"
                icon="person-add-outline"
                variant="outline"
                onPress={() => navigation.navigate('AuthModal', { screen: 'Register' })}
                style={{ width: '100%' }}
            />
        </View>
    );
}
