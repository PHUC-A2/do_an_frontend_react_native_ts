// Stub screens for admin — expand each as needed
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, SPACING } from '@config/theme';

const stub = (title: string) =>
    function StubScreen() {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}><Text style={styles.title}>{title}</Text></View>
                <View style={styles.center}><Text style={styles.text}>Đang phát triển...</Text></View>
            </SafeAreaView>
        );
    };

export default stub;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: SPACING.xl, backgroundColor: COLORS.primary },
    title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    text: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
