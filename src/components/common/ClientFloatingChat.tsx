import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@config/ThemeContext';
import { chatService } from '@services/chat.service';
import ClientAiChatBot from './chat/ClientAiChatBot';
import ClientMessageButton from './chat/ClientMessageButton';
import ClientBackToTopButton from './chat/ClientBackToTopButton';
import { CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, CLIENT_SCROLL_TO_TOP_EVENT } from './chat/chat.constants';
import { DeviceEventEmitter } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

export default function ClientFloatingChat() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [pageId, setPageId] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [canShowBackToTopByScroll, setCanShowBackToTopByScroll] = useState(false);
    const navState = useNavigationState((state) => state);

    const getActiveRouteName = (state: any): string | null => {
        if (!state?.routes?.length) return null;
        const route = state.routes[state.index ?? 0];
        if (route?.state) {
            return getActiveRouteName(route.state);
        }
        return route?.name ?? null;
    };

    useEffect(() => {
        const loadMessengerConfig = async () => {
            try {
                const res = await chatService.getPublicMessengerConfig();
                setPageId(res.data.data?.pageId ?? '');
            } catch {
                setPageId('');
            }
        };
        void loadMessengerConfig();
    }, []);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(CLIENT_BACK_TO_TOP_VISIBILITY_EVENT, (visible: boolean) => {
            setCanShowBackToTopByScroll(Boolean(visible));
        });
        return () => sub.remove();
    }, []);

    const openMessenger = async () => {
        try {
            const finalPageId = pageId || (await chatService.getPublicMessengerConfig()).data.data?.pageId || '';
            if (!finalPageId) {
                Alert.alert('Messenger', 'Hiện chưa cấu hình trang Messenger.');
                return;
            }
            setPageId(finalPageId);
            const rawValue = finalPageId.trim();
            const url = /^https?:\/\//i.test(rawValue)
                ? rawValue
                : `https://m.me/${rawValue.replace(/^\/+/, '')}`;
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert('Messenger', 'Thiết bị không hỗ trợ mở liên kết Messenger.');
                return;
            }
            await Linking.openURL(url);
        } catch {
            Alert.alert('Messenger', 'Không thể mở Messenger lúc này. Vui lòng thử lại.');
        }
    };

    const backToTop = () => {
        DeviceEventEmitter.emit(CLIENT_SCROLL_TO_TOP_EVENT);
    };

    const activeRouteName = getActiveRouteName(navState);
    const shouldShowBackToTop =
        (activeRouteName === 'Home' || activeRouteName === 'Pitches') && canShowBackToTopByScroll;

    const aiBottom = useMemo(() => 60 + insets.bottom + 16, [insets.bottom]);
    const messengerBottom = useMemo(() => aiBottom + 46, [aiBottom]);
    const backToTopBottom = useMemo(() => aiBottom + 100, [aiBottom]);

    return (
        <>
            <ClientMessageButton
                bottom={messengerBottom}
                visible={!chatOpen}
                onPress={openMessenger}
            />
            <ClientBackToTopButton
                bottom={backToTopBottom}
                visible={!chatOpen && shouldShowBackToTop}
                onPress={backToTop}
                color={colors.textSecondary}
            />
            <ClientAiChatBot
                buttonBottom={aiBottom}
                onOpenChange={setChatOpen}
            />
        </>
    );
}
