import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    FlatList,
    AppState,
    type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { fetchPitchById } from '@redux/slices/pitchSlice';
import { ClientScreenProps } from '@navigation/types';
import Button from '@components/common/Button';
import { useTheme } from '@config/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@config/theme';
import { getPitchTypeLabel, PITCH_STATUS_LABEL, IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';
import { pitchService } from '@services/pitch.service';
import { reviewService } from '@services/review.service';
import { useAuth } from '@hooks/useAuth';
import { storage } from '@utils/storage';
import { buildReviewChatWebSocketUrl } from '@utils/reviewChatWsUrl';
import type { ResReviewDTO, ResReviewMessageDTO } from '@/types/review.types';

type Props = ClientScreenProps<'PitchDetail'>;

const STAR_GOLD = '#FBBF24';

const REVIEW_STATUS_VI: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    HIDDEN: 'Đã ẩn',
};

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
    const filled = Math.min(5, Math.max(0, Math.round(rating)));
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= filled ? 'star' : 'star-outline'} size={size} color={STAR_GOLD} />
            ))}
        </View>
    );
}

function formatReviewDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

export default function PitchDetailScreen({ route, navigation }: Props) {
    const { pitchId } = route.params;
    const dispatch = useAppDispatch();
    const { colors } = useTheme();
    const { selectedPitch, isLoading } = useAppSelector((s) => s.pitch);
    const lastRealtimeEvent = useAppSelector((s) => s.realtime.lastEvent);
    const { isAuthenticated, user } = useAuth();
    const insets = useSafeAreaInsets();
    const CTA_HEIGHT = 72 + insets.bottom;

    const [publicReviews, setPublicReviews] = useState<ResReviewDTO[]>([]);
    const [myPitchReviews, setMyPitchReviews] = useState<ResReviewDTO[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const handledPitchReviewsRealtimeSeq = useRef(0);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [draftRating, setDraftRating] = useState(5);
    const [draftContent, setDraftContent] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatReview, setChatReview] = useState<ResReviewDTO | null>(null);
    const [chatMessages, setChatMessages] = useState<ResReviewMessageDTO[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatWsRef = useRef<WebSocket | null>(null);

    const currentUserId = user?.id ?? null;

    const loadPublicReviews = useCallback(async () => {
        try {
            const res = await pitchService.getPublicPitchReviews(pitchId);
            setPublicReviews(res.data.data ?? []);
        } catch {
            setPublicReviews([]);
        }
    }, [pitchId]);

    const loadMyPitchReviews = useCallback(async () => {
        if (!isAuthenticated) {
            setMyPitchReviews([]);
            return;
        }
        try {
            const res = await reviewService.getMyReviews();
            const list = res.data.data ?? [];
            setMyPitchReviews(
                list.filter((r) => r.targetType === 'PITCH' && Number(r.pitchId) === Number(pitchId)),
            );
        } catch {
            setMyPitchReviews([]);
        }
    }, [isAuthenticated, pitchId]);

    const refreshAllReviews = useCallback(async () => {
        setReviewsLoading(true);
        try {
            await Promise.all([loadPublicReviews(), loadMyPitchReviews()]);
        } finally {
            setReviewsLoading(false);
        }
    }, [loadPublicReviews, loadMyPitchReviews]);

    useEffect(() => {
        dispatch(fetchPitchById(pitchId));
    }, [pitchId, dispatch]);

    useEffect(() => {
        void refreshAllReviews();
    }, [refreshAllReviews]);

    useFocusEffect(
        useCallback(() => {
            void refreshAllReviews();
        }, [refreshAllReviews]),
    );

    useEffect(() => {
        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'active') void refreshAllReviews();
        });
        return () => sub.remove();
    }, [refreshAllReviews]);

    useEffect(() => {
        if (!lastRealtimeEvent || lastRealtimeEvent.event !== 'pitch_reviews_updated') return;
        if (lastRealtimeEvent.pitchId !== pitchId) return;
        if (lastRealtimeEvent.seq <= handledPitchReviewsRealtimeSeq.current) return;
        handledPitchReviewsRealtimeSeq.current = lastRealtimeEvent.seq;
        void refreshAllReviews();
        dispatch(fetchPitchById(pitchId));
    }, [lastRealtimeEvent, pitchId, refreshAllReviews, dispatch]);

    useEffect(() => {
        if (selectedPitch) {
            navigation.setOptions({ title: selectedPitch.name });
        }
    }, [selectedPitch?.name, navigation, selectedPitch]);

    const closeChatSocket = () => {
        if (chatWsRef.current) {
            chatWsRef.current.close();
            chatWsRef.current = null;
        }
    };

    useEffect(() => {
        if (!chatModalOpen || !chatReview) {
            closeChatSocket();
            return;
        }

        let cancelled = false;
        let poll: ReturnType<typeof setInterval> | null = null;

        const syncMessages = () => {
            void reviewService
                .getMessages(chatReview.id)
                .then((r) => {
                    if (!cancelled) setChatMessages(r.data.data ?? []);
                })
                .catch(() => {});
        };

        syncMessages();
        poll = setInterval(syncMessages, 4000);

        void (async () => {
            const token = await storage.getAccessToken();
            if (!token || cancelled) return;
            const ws = new WebSocket(buildReviewChatWebSocketUrl(chatReview.id, token));
            chatWsRef.current = ws;
            ws.onmessage = (ev) => {
                try {
                    const incoming = JSON.parse(String(ev.data ?? '')) as ResReviewMessageDTO;
                    if (incoming?.id != null) {
                        setChatMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
                    }
                } catch {
                    /* ignore */
                }
            };
            ws.onerror = () => {
                /* REST + polling vẫn hoạt động */
            };
        })();

        return () => {
            cancelled = true;
            if (poll) clearInterval(poll);
            closeChatSocket();
        };
    }, [chatModalOpen, chatReview?.id]);

    const openChatModal = (review: ResReviewDTO) => {
        setChatReview(review);
        setChatInput('');
        setChatMessages([]);
        setChatModalOpen(true);
    };

    const closeChatModal = () => {
        setChatModalOpen(false);
        setChatReview(null);
        setChatInput('');
        setChatMessages([]);
    };

    const handleSendChat = async () => {
        if (!chatReview || !chatInput.trim()) return;
        const payload = { content: chatInput.trim() };
        if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
            chatWsRef.current.send(JSON.stringify(payload));
            setChatInput('');
            return;
        }
        try {
            await reviewService.sendMessage(chatReview.id, payload);
            const res = await reviewService.getMessages(chatReview.id);
            setChatMessages(res.data.data ?? []);
            setChatInput('');
        } catch {
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
        }
    };

    const handleCreateReview = async () => {
        if (!draftContent.trim()) {
            Alert.alert('Thiếu nội dung', 'Vui lòng nhập nhận xét');
            return;
        }
        setSubmittingReview(true);
        try {
            const res = await reviewService.createReview({
                targetType: 'PITCH',
                pitchId,
                rating: draftRating,
                content: draftContent.trim(),
            });
            const created = res.data.data;
            Alert.alert('Thành công', 'Đánh giá đã được gửi');
            setCreateModalOpen(false);
            setDraftContent('');
            setDraftRating(5);
            await refreshAllReviews();
            dispatch(fetchPitchById(pitchId));
            if (created) openChatModal(created);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            Alert.alert('Lỗi', msg ?? 'Không thể gửi đánh giá');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (isLoading || !selectedPitch) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }} edges={['bottom', 'left', 'right']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    const pitch = selectedPitch;
    const imageUri = pitch.pitchUrl
        ? (pitch.pitchUrl.startsWith('http') ? pitch.pitchUrl : `${IMAGE_BASE_URL}${pitch.pitchUrl}`)
        : null;
    const statusColor = pitch.status === 'ACTIVE' ? colors.success : pitch.status === 'MAINTENANCE' ? colors.warning : colors.danger;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: CTA_HEIGHT + 16 }} keyboardShouldPersistTaps="handled">

                <View style={[styles.heroWrapper, { backgroundColor: colors.primaryLight }]}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <Ionicons name="football" size={72} color={colors.primary} />
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + 'EE' }]}>
                        <Text style={styles.statusBadgeText}>{PITCH_STATUS_LABEL[pitch.status]}</Text>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

                    <View style={styles.titleRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>{pitch.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.typeText, { color: colors.primary }]}>{getPitchTypeLabel(pitch.pitchTypeName)}</Text>
                        </View>
                    </View>

                    {(pitch.averageRating ?? 0) > 0 && (
                        <View style={styles.ratingRow}>
                            <StarRow rating={pitch.averageRating!} />
                            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                                {pitch.averageRating!.toFixed(1)} · {pitch.reviewCount} đánh giá
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(pitch.address)}`)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>{pitch.address}</Text>
                        <Text style={[styles.infoText, { color: colors.textHint }]}>Google Maps</Text>
                        <Ionicons name="location" size={14} color={colors.textHint} />
                    </TouchableOpacity>

                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {pitch.open24h ? 'Mở cửa 24/7' : `${pitch.openTime?.slice(0, 5) ?? '?'} – ${pitch.closeTime?.slice(0, 5) ?? '?'}`}
                        </Text>
                        {pitch.open24h && (
                            <View style={[styles.chip, { backgroundColor: colors.success + '22' }]}>
                                <Text style={{ fontSize: FONT_SIZE.xs, color: colors.success, fontWeight: FONT_WEIGHT.semibold }}>24/7</Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    {(pitch.length || pitch.width || pitch.height) ? (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Kích thước sân</Text>
                            <View style={styles.dimensionRow}>
                                {pitch.length ? (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="resize-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.length}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Dài</Text>
                                    </View>
                                ) : null}
                                {pitch.width ? (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.width}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Rộng</Text>
                                    </View>
                                ) : null}
                                {pitch.height ? (
                                    <View style={[styles.dimCard, { backgroundColor: colors.surfaceVariant }]}>
                                        <Ionicons name="arrow-up-outline" size={18} color={colors.primary} />
                                        <Text style={[styles.dimValue, { color: colors.textPrimary }]}>{pitch.height}m</Text>
                                        <Text style={[styles.dimLabel, { color: colors.textHint }]}>Cao</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    ) : null}

                    {pitch.hourlyPrices.length > 0 ? (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bảng giá</Text>
                            <View style={[styles.priceTable, { borderColor: colors.border }]}>
                                <View style={[styles.priceTableHeader, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.priceColHead, { color: colors.primary }]}>Khung giờ</Text>
                                    <Text style={[styles.priceColHead, { color: colors.primary, textAlign: 'right' }]}>Giá/giờ</Text>
                                </View>
                                {pitch.hourlyPrices.map((p, i) => (
                                    <View
                                        key={p.startTime}
                                        style={[styles.priceTableRow, { backgroundColor: i % 2 === 0 ? colors.surface : colors.surfaceVariant, borderTopColor: colors.divider }]}
                                    >
                                        <View style={styles.priceTimeCell}>
                                            <Ionicons name="time-outline" size={12} color={colors.textHint} />
                                            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                                                {p.startTime.slice(0, 5)} – {p.endTime.slice(0, 5)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.priceValue, { color: colors.primary }]}>{formatVND(p.pricePerHour)}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    ) : null}

                    {pitch.description ? (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mô tả</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>{pitch.description}</Text>
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    ) : null}

                    <View style={styles.reviewsHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Đánh giá & nhận xét</Text>
                        {isAuthenticated ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setDraftRating(5);
                                    setDraftContent('');
                                    setCreateModalOpen(true);
                                }}
                                style={[styles.writeReviewBtn, { backgroundColor: colors.primaryLight }]}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={18} color={colors.primary} />
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>Viết đánh giá</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AuthModal')}
                                style={[styles.writeReviewBtn, { backgroundColor: colors.surfaceVariant }]}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>Đăng nhập để gửi đánh giá</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {reviewsLoading ? (
                        <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null}

                    {!reviewsLoading && isAuthenticated && myPitchReviews.length > 0 ? (
                        <>
                            <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Phần của bạn</Text>
                            {myPitchReviews.map((r) => (
                                <View
                                    key={`mine-${r.id}`}
                                    style={[styles.reviewCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                                >
                                    <View style={styles.reviewHeader}>
                                        <StarRow rating={r.rating} size={16} />
                                        <View style={[styles.statusPill, { backgroundColor: colors.primaryLight }]}>
                                            <Text style={{ fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: FONT_WEIGHT.semibold }}>
                                                {REVIEW_STATUS_VI[r.status] ?? r.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.reviewBody, { color: colors.textSecondary }]}>{r.content}</Text>
                                    <TouchableOpacity onPress={() => openChatModal(r)} style={styles.chatLink} activeOpacity={0.75}>
                                        <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                                        <Text style={{ fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium }}>Trao đổi với quản trị</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        </>
                    ) : null}

                    {!reviewsLoading ? (
                        <>
                            <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Đã duyệt (công khai)</Text>
                            {publicReviews.filter((r) => !myPitchReviews.some((m) => m.id === r.id)).length === 0 ? (
                                <Text style={[styles.description, { color: colors.textHint }]}>Chưa có nhận xét đã duyệt.</Text>
                            ) : (
                                publicReviews.filter((r) => !myPitchReviews.some((m) => m.id === r.id)).map((r) => {
                                    const name = (r.userFullName?.trim() || r.userName || 'Khách').trim();
                                    return (
                                        <View
                                            key={r.id}
                                            style={[styles.reviewCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                                        >
                                            <View style={styles.reviewHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.reviewName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
                                                    <Text style={[styles.reviewMeta, { color: colors.textHint }]}>{formatReviewDate(r.createdAt)}</Text>
                                                </View>
                                                <StarRow rating={r.rating} size={16} />
                                            </View>
                                            <Text style={[styles.reviewBody, { color: colors.textSecondary }]}>{r.content}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </>
                    ) : null}
                </View>
            </ScrollView>

            <View style={[styles.cta, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom || SPACING.lg }]}>
                <View style={styles.ctaPrice}>
                    <Text style={[styles.ctaPriceLabel, { color: colors.textHint }]}>Từ</Text>
                    <Text style={[styles.ctaPriceValue, { color: colors.primary }]}>
                        {formatVND(pitch.hourlyPrices[0]?.pricePerHour ?? pitch.pricePerHour)}
                    </Text>
                    <Text style={[styles.ctaPriceLabel, { color: colors.textHint }]}>/giờ</Text>
                </View>
                <View style={styles.ctaButton}>
                    <Button
                        title="Đặt sân ngay"
                        onPress={() => navigation.navigate('BookingTimeline', { pitchId: pitch.id })}
                        disabled={pitch.status !== 'ACTIVE'}
                    />
                </View>
            </View>

            <Modal visible={createModalOpen} animationType="slide" transparent onRequestClose={() => setCreateModalOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Gửi đánh giá sân</Text>
                        <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Chọn số sao</Text>
                        <View style={styles.starPicker}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setDraftRating(s)} hitSlop={8}>
                                    <Ionicons name={s <= draftRating ? 'star' : 'star-outline'} size={32} color={STAR_GOLD} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={[styles.modalHint, { color: colors.textSecondary }]}>Nội dung nhận xét</Text>
                        <TextInput
                            value={draftContent}
                            onChangeText={setDraftContent}
                            placeholder="Chia sẻ trải nghiệm của bạn..."
                            placeholderTextColor={colors.textHint}
                            multiline
                            style={[styles.reviewTextArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                        />
                        <View style={styles.modalActions}>
                            <Button title="Hủy" variant="outline" onPress={() => setCreateModalOpen(false)} />
                            <Button title="Gửi" loading={submittingReview} onPress={() => void handleCreateReview()} />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={chatModalOpen} animationType="slide" onRequestClose={closeChatModal}>
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
                    <View style={[styles.chatToolbar, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={closeChatModal} hitSlop={12}>
                            <Ionicons name="chevron-back" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.chatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            Chat đánh giá #{chatReview?.id}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <FlatList
                        data={chatMessages}
                        keyExtractor={(m) => String(m.id)}
                        contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
                        renderItem={({ item }) => {
                            const mine = currentUserId != null && item.senderId === currentUserId;
                            const sender = (item.senderFullName?.trim() || item.senderName || 'Người gửi').trim();
                            return (
                                <View
                                    style={[
                                        styles.bubble,
                                        mine ? styles.bubbleMine : styles.bubbleOther,
                                        { backgroundColor: mine ? colors.primaryLight : colors.surfaceVariant },
                                    ]}
                                >
                                    {!mine ? <Text style={[styles.bubbleSender, { color: colors.textHint }]}>{sender}</Text> : null}
                                    <Text style={{ color: colors.textPrimary }}>{item.content}</Text>
                                    <Text style={[styles.bubbleTime, { color: colors.textHint }]}>
                                        {formatReviewDate(item.createdAt)}
                                    </Text>
                                </View>
                            );
                        }}
                    />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom + 8}>
                        <View style={[styles.chatInputRow, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom || SPACING.md }]}>
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Nhập tin nhắn..."
                                placeholderTextColor={colors.textHint}
                                style={[styles.chatInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            />
                            <TouchableOpacity onPress={() => void handleSendChat()} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                                <Ionicons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    heroWrapper: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroImage: { width: '100%', height: '100%' },
    statusBadge: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
    },
    statusBadgeText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: FONT_WEIGHT.semibold },
    card: {
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.xl,
        ...SHADOW.sm,
    },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
    name: { flex: 1, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, marginRight: SPACING.sm },
    typeBadge: { borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
    typeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: SPACING.md },
    ratingText: { fontSize: FONT_SIZE.sm, marginLeft: SPACING.xs },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    infoText: { fontSize: FONT_SIZE.md },
    chip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginLeft: SPACING.xs },
    divider: { height: 1, marginVertical: SPACING.lg },
    sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.md },
    subSectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.sm },
    dimensionRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
    dimCard: { flex: 1, alignItems: 'center', borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, gap: SPACING.xs },
    dimValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    dimLabel: { fontSize: FONT_SIZE.xs },
    priceTable: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, overflow: 'hidden', marginBottom: SPACING.sm },
    priceTableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    priceColHead: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    priceTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderTopWidth: 1 },
    priceTimeCell: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    priceLabel: { fontSize: FONT_SIZE.sm },
    priceValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
    description: { fontSize: FONT_SIZE.md, lineHeight: 22 },
    reviewsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
    writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.md },
    reviewCard: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.md },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    reviewName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
    reviewMeta: { fontSize: FONT_SIZE.xs, marginTop: 2 },
    reviewBody: { fontSize: FONT_SIZE.sm, lineHeight: 20 },
    statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
    chatLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
    cta: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderTopWidth: 1,
        gap: SPACING.md,
    },
    ctaPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    ctaPriceLabel: { fontSize: FONT_SIZE.sm },
    ctaPriceValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    ctaButton: { flex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: SPACING.lg },
    modalCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl },
    modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.md },
    modalHint: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
    starPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
    reviewTextArea: { minHeight: 100, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.lg },
    chatToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
    chatTitle: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
    bubble: { maxWidth: '85%', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm },
    bubbleMine: { alignSelf: 'flex-end' },
    bubbleOther: { alignSelf: 'flex-start' },
    bubbleSender: { fontSize: FONT_SIZE.xs, marginBottom: 4 },
    bubbleTime: { fontSize: FONT_SIZE.xs, marginTop: 4 },
    chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm, borderTopWidth: 1 },
    chatInput: { flex: 1, borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 44 },
    sendBtn: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
