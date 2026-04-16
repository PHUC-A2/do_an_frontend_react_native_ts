import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ClientBackToTopButtonProps {
    bottom: number;
    right?: number;
    visible: boolean;
    onPress: () => void;
    color: string;
}

const ClientBackToTopButton = ({ bottom, right = 16, visible, onPress, color }: ClientBackToTopButtonProps) => {
    if (!visible) return null;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                position: 'absolute',
                right,
                bottom,
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: `${color}22`,
                borderWidth: 1,
                borderColor: `${color}55`,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                elevation: 2000,
            }}
            activeOpacity={0.85}
        >
            <Ionicons name="arrow-up" size={18} color={color} />
        </TouchableOpacity>
    );
};

export default ClientBackToTopButton;
