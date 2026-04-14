import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { COLORS } from '@config/theme';

interface LoadingOverlayProps {
    visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.container}>
                <View style={styles.box}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 28,
    },
});
