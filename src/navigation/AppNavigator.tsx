import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { hydrateAuth } from '@redux/slices/authSlice';
import { fetchAccount } from '@redux/slices/accountSlice';
import { RootStackParamList } from './types';
import { COLORS } from '@config/theme';
import BiometricGateOverlay from '@components/auth/BiometricGateOverlay';

import ClientNavigator from './ClientNavigator';
import AdminNavigator from './AdminNavigator';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const dispatch = useAppDispatch();
    const { isAuthenticated, isHydrated, pendingBiometricUnlock } = useAppSelector((s) => s.auth);
    const account = useAppSelector((s) => s.account.account);

    useEffect(() => {
        dispatch(hydrateAuth());
    }, [dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchAccount());
        }
    }, [dispatch, isAuthenticated]);

    if (!isHydrated) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (pendingBiometricUnlock) {
        return <BiometricGateOverlay />;
    }

    const isAdmin = (account?.roles ?? []).some((role) => role.name === 'ADMIN');

    return (
        <NavigationContainer>
            <Root.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={isAuthenticated && isAdmin ? 'Admin' : 'Client'}
            >
                <Root.Screen name="Client" component={ClientNavigator} />
                <Root.Screen name="Admin" component={AdminNavigator} />
            </Root.Navigator>
        </NavigationContainer>
    );
}
