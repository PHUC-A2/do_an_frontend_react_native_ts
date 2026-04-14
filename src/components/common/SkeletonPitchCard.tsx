import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, SPACING } from '@config/theme';

function ShimmerBox({ width, height, borderRadius = BORDER_RADIUS.sm, style }: {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: object;
}) {
    const { colors, isDark } = useTheme();
    const opacity = useRef(new Animated.Value(isDark ? 0.15 : 0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: isDark ? 0.35 : 0.7,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: isDark ? 0.15 : 0.4,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [isDark]);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? colors.surfaceVariant : colors.divider,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export default function SkeletonPitchCard() {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={{
                backgroundColor: colors.surface,
                borderRadius: BORDER_RADIUS.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: SPACING.md,
                ...(isDark
                    ? {}
                    : {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 3,
                    }),
            }}
        >
            {/* Image placeholder 16:9 */}
            <ShimmerBox width="100%" height={200} borderRadius={0} />

            <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
                {/* Name */}
                <ShimmerBox width="70%" height={18} />

                {/* Address */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                    <ShimmerBox width={14} height={14} borderRadius={BORDER_RADIUS.xs} />
                    <ShimmerBox width="85%" height={12} />
                </View>

                {/* Type badge + status */}
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <ShimmerBox width={60} height={22} borderRadius={BORDER_RADIUS.full} />
                    <ShimmerBox width={90} height={22} borderRadius={BORDER_RADIUS.full} />
                </View>

                {/* Price + time row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ShimmerBox width="40%" height={14} />
                    <ShimmerBox width="35%" height={14} />
                </View>

                {/* Rating */}
                <ShimmerBox width="50%" height={12} />

                {/* Button */}
                <ShimmerBox width="100%" height={44} borderRadius={BORDER_RADIUS.md} style={{ marginTop: SPACING.xs }} />
            </View>
        </View>
    );
}
