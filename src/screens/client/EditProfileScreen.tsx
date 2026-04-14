// Stub — implement edit profile form
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, SPACING } from '@config/theme';

export default function EditProfileScreen() {
    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <View style={styles.center}>
                <Text style={styles.text}>Chỉnh sửa thông tin cá nhân</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    text: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
