import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '@config/theme';
import { IMAGE_BASE_URL } from '@utils/constants';
import { getInitials } from '@utils/helpers';

interface AvatarProps {
    uri?: string | null;
    avatarUrl?: string | null;
    name?: string;
    size?: number;
}

export default function Avatar({ uri, avatarUrl, name = '', size = 40 }: AvatarProps) {
    // Đánh dấu lỗi tải ảnh để fallback về avatar mặc định.
    const [isImageLoadError, setIsImageLoadError] = useState(false);

    // Đồng bộ cách hiển thị ảnh với pitch: nếu là URL đầy đủ thì dùng trực tiếp,
    // nếu là path tương đối thì nối IMAGE_BASE_URL.
    const profileImageUri = useMemo(() => {
        // Ưu tiên giá trị có nội dung thật; tránh case uri="" làm bỏ qua avatarUrl.
        const normalizedUri = [uri, avatarUrl]
            .map((value) => value?.trim() ?? '')
            .find((value) => value.length > 0) ?? '';
        if (!normalizedUri) return null;
        if (normalizedUri.startsWith('http')) return normalizedUri;
        const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
        const path = normalizedUri.startsWith('/') ? normalizedUri : `/${normalizedUri}`;
        return `${base}${path}`;
    }, [uri, avatarUrl]);

    useEffect(() => {
        setIsImageLoadError(false);
    }, [profileImageUri]);

    if (profileImageUri && !isImageLoadError) {
        return (
            <Image
                source={{ uri: profileImageUri }}
                style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
                onError={() => {
                    // Nếu URL ảnh lỗi thì fallback về avatar mặc định.
                    setIsImageLoadError(true);
                }}
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
