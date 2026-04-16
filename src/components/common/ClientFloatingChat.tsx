import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Linking,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@config/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@config/theme';
import { chatService } from '@services/chat.service';
import { useAuth } from '@hooks/useAuth';
import EmojiSelector from 'react-native-emoji-selector';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
    senderName: string;
    createdAt: string;
}

export default function ClientFloatingChat() {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [pageId, setPageId] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Xin chào! Tôi là trợ lý AI của TBU Sport. Tôi có thể hỗ trợ bạn tìm sân và đặt sân nhanh hơn.',
            senderName: 'TBU Sport AI',
            createdAt: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(36);
    const scrollRef = useRef<ScrollView>(null);
    const pulseAnim = useRef(new Animated.Value(0)).current;

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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

    useEffect(() => {
        if (!chatOpen) return;
        const timer = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [chatOpen, messages.length, loading]);

    const openMessenger = () => {
        if (!pageId) return;
        void Linking.openURL(`https://m.me/${pageId}`);
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;
        const now = new Date().toISOString();
        const currentUserName = user?.name?.trim() || user?.email?.trim() || 'Bạn';

        const nextMessages = [
            ...messages,
            { role: 'user' as const, content: text, senderName: currentUserName, createdAt: now },
        ];
        setMessages(nextMessages);
        setInput('');
        setEmojiPickerOpen(false);
        setLoading(true);

        try {
            const history = nextMessages.slice(1, -1).map((m) => ({ role: m.role, content: m.content }));
            const res = await chatService.clientAiChat({ message: text, history });
            const data = res.data.data;
            if (data) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: data.reply,
                        provider: data.provider,
                        senderName: 'TBU Sport AI',
                        createdAt: new Date().toISOString(),
                    },
                ]);
                setRemaining(data.remainingMessages);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Xin lỗi, hệ thống AI đang bận. Vui lòng thử lại sau.',
                    senderName: 'TBU Sport AI',
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const chatBottom = useMemo(() => insets.bottom + 72, [insets.bottom]);
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] });

    return (
        <>
            <View
                pointerEvents="box-none"
                style={{
                    position: 'absolute',
                    right: 16,
                    bottom: chatBottom,
                    gap: 12,
                    alignItems: 'flex-end',
                }}
            >
                {pageId && !chatOpen ? (
                    <Animated.View style={{ transform: [{ scale: pulseScale }], opacity: pulseOpacity }}>
                        <TouchableOpacity
                            onPress={openMessenger}
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
                ) : null}

                {!chatOpen ? (
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('Client', {
                                screen: 'ClientTabs',
                                params: { screen: 'Home' },
                            })
                        }
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-up" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : null}

                <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                    <TouchableOpacity
                        onPress={() => setChatOpen(true)}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.primary + '22',
                            borderWidth: 1,
                            borderColor: colors.primary + '66',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={0.85}
                    >
                        <MaterialCommunityIcons name="robot-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <Modal visible={chatOpen} transparent animationType="fade" onRequestClose={() => setChatOpen(false)}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
                >
                    <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
                        <View
                            style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: BORDER_RADIUS.lg,
                                borderTopRightRadius: BORDER_RADIUS.lg,
                                height: '72%',
                                maxHeight: '88%',
                                borderTopWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: SPACING.lg,
                                paddingVertical: SPACING.md,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <Text style={{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary }}>
                                TBU Sport AI
                            </Text>
                            <TouchableOpacity onPress={() => setChatOpen(false)} activeOpacity={0.7}>
                                <Ionicons name="close" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm }}>
                            {messages.map((msg, idx) => (
                                <View
                                    key={`${msg.role}-${idx}`}
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '84%',
                                        backgroundColor: msg.role === 'user' ? colors.primary : colors.background,
                                        borderRadius: 14,
                                        paddingHorizontal: SPACING.md,
                                        paddingVertical: SPACING.sm,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: FONT_SIZE.xs,
                                            color: msg.role === 'user' ? '#ffffffcc' : colors.textHint,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {msg.senderName} - {formatTime(msg.createdAt)}
                                    </Text>
                                    <Text style={{ color: msg.role === 'user' ? '#fff' : colors.textPrimary, fontSize: FONT_SIZE.sm }}>
                                        {msg.content}
                                    </Text>
                                    {msg.provider && msg.role === 'assistant' ? (
                                        <Text style={{ marginTop: 4, fontSize: FONT_SIZE.xs, color: colors.textHint }}>
                                            {msg.provider}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}
                            {loading ? (
                                <View style={{ paddingVertical: SPACING.sm }}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : null}
                        </ScrollView>

                        {remaining !== null && remaining < 20 ? (
                            <Text
                                style={{
                                    fontSize: FONT_SIZE.xs,
                                    color: colors.textHint,
                                    paddingHorizontal: SPACING.lg,
                                    paddingBottom: SPACING.xs,
                                }}
                            >
                                Còn {remaining} tin nhắn hôm nay
                            </Text>
                        ) : null}
                        {emojiPickerOpen ? (
                            <View
                                style={{
                                    paddingHorizontal: SPACING.lg,
                                    paddingBottom: SPACING.sm,
                                    height: 230,
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                }}
                            >
                                <EmojiSelector
                                    onEmojiSelected={(emoji) => setInput((prev) => `${prev}${emoji}`)}
                                    showSearchBar
                                    showTabs
                                    showHistory
                                    showSectionTitles={false}
                                    columns={8}
                                />
                            </View>
                        ) : null}

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-end',
                                    gap: SPACING.sm,
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                    paddingHorizontal: SPACING.lg,
                                    paddingTop: SPACING.md,
                                    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.md + insets.bottom,
                                }}
                            >
                            <TouchableOpacity
                                onPress={() => setEmojiPickerOpen((prev) => !prev)}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 17,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="happy-outline" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                placeholder="Nhập câu hỏi..."
                                placeholderTextColor={colors.textHint}
                                style={{
                                    flex: 1,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 18,
                                    paddingHorizontal: SPACING.md,
                                    paddingVertical: SPACING.sm,
                                    color: colors.textPrimary,
                                    minHeight: 36,
                                    maxHeight: 110,
                                    height: inputHeight,
                                    textAlignVertical: 'top',
                                }}
                                editable={!loading}
                                multiline
                                returnKeyType="default"
                                onContentSizeChange={(event) => {
                                    const nextHeight = Math.max(36, Math.min(110, event.nativeEvent.contentSize.height));
                                    setInputHeight(nextHeight);
                                }}
                            />
                            <TouchableOpacity
                                onPress={sendMessage}
                                disabled={loading || input.trim().length === 0}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 19,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: loading || input.trim().length === 0 ? colors.textDisabled : colors.primary,
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="send" size={16} color="#fff" />
                            </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}
