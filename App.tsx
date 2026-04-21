import 'react-native-gesture-handler';
import './src/i18n';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { store } from '@redux/store';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchNotifications } from '@redux/slices/notificationSlice';
import AppNavigator from '@navigation/AppNavigator';
import { navigateFromNotificationPayload } from '@navigation/navigationRef';
import { ThemeProvider, useTheme } from '@config/ThemeContext';
import { notificationService } from '@services/notification.service';
import { realtimeService } from '@services/realtime.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppContent() {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authRef = useRef(isAuthenticated);

  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    notificationService.initializeNotificationRuntime({
      onNotificationReceived: (notification, payload) => {
        console.log('[push][foreground]', JSON.stringify({
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: payload,
        }));
        if (authRef.current && notification.request.content.data?.__source !== 'local-ws') {
          void dispatch(fetchNotifications());
        }
      },
      onNotificationResponse: (response, payload) => {
        console.log('[push][tap]', JSON.stringify({
          actionIdentifier: response.actionIdentifier,
          data: payload,
        }));
        if (authRef.current) {
          void dispatch(fetchNotifications());
        }
        navigateFromNotificationPayload(payload);
      },
    }).then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      cleanup?.();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      realtimeService.stop();
      return;
    }
    notificationService.registerPushTokenForCurrentUser().catch((error) => {
      console.log('[push][register][error]', error);
    });
    realtimeService.start().catch((error) => {
      console.log('[realtime][start][error]', error);
    });
    return () => {
      realtimeService.stop();
    };
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

