import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ClientMessageButtonProps {
    bottom: number;
    right?: number;
    visible: boolean;
    onPress: () => void;
}

const ClientMessageButton = ({ bottom, right = 16, visible, onPress }: ClientMessageButtonProps) => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    if (!visible) return null;

    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                right,
                bottom,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
                zIndex: 2000,
                elevation: 2000,
            }}
        >
            <TouchableOpacity
                onPress={onPress}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#0084FF22',
                    borderWidth: 1,
                    borderColor: '#0084FF66',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                activeOpacity={0.85}
            >
                <FontAwesome5 name="facebook-messenger" size={18} color="#0084FF" />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default ClientMessageButton;
