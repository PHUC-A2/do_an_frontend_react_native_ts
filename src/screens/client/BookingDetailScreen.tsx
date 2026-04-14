// Stub — implement booking detail view as needed
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClientScreenProps } from '@navigation/types';
import { COLORS, FONT_SIZE, SPACING } from '@config/theme';

type Props = ClientScreenProps<'BookingDetail'>;

export default function BookingDetailScreen({ route }: Props) {
    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <View style={styles.center}>
                <Text style={styles.text}>Booking #{route.params.bookingId}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    text: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
