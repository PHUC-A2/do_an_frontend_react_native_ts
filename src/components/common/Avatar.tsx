import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '@config/theme';
import { getInitials } from '@utils/helpers';

interface AvatarProps {
    uri?: string | null;
    name?: string;
    size?: number;
}

export default function Avatar({ uri, name = '', size = 40 }: AvatarProps) {
    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
            />
        );
    }
    return (
        <View
            style={[
                styles.placeholder,
                { width: size, height: size, borderRadius: size / 2 },
            ]}
        >
            <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    image: { backgroundColor: COLORS.border },
    placeholder: {
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        color: '#fff',
        fontWeight: '700',
    },
});
