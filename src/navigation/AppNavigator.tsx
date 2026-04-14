import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { hydrateAuth } from '@redux/slices/authSlice';
import { RootStackParamList } from './types';
import { COLORS } from '@config/theme';

import ClientNavigator from './ClientNavigator';
import AdminNavigator from './AdminNavigator';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const dispatch = useAppDispatch();
    const { isAuthenticated, isHydrated, user } = useAppSelector((s) => s.auth);

    useEffect(() => {
        dispatch(hydrateAuth());
    }, [dispatch]);

    if (!isHydrated) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Check admin role from user object (populated after fetchAccountAsync)
    const isAdmin = false; // TODO: derive from user roles in redux when account is fetched

    return (
        <NavigationContainer>
            <Root.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated && isAdmin ? (
                    <Root.Screen name="Admin" component={AdminNavigator} />
                ) : (
                    // Always show ClientNavigator — guests can browse freely,
                    // protected screens show a login prompt internally.
                    <Root.Screen name="Client" component={ClientNavigator} />
                )}
            </Root.Navigator>
        </NavigationContainer>
    );
}
