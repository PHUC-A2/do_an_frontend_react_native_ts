import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    Modal,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Animated,
    Share,
    Platform,
    Dimensions,
    StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClientScreenProps, ClientStackParamList } from '@navigation/types';
import { useTheme } from '@config/ThemeContext';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@config/theme';
import { paymentService } from '@services/payment.service';
import { bookingService } from '@services/booking.service';
import { pitchService } from '@services/pitch.service';
import { ResPaymentQRDTO, PaymentMethod, PAYMENT_METHOD_OPTIONS } from '@/types/payment.types';
import { ResBookingDTO } from '@/types/booking.types';
import { ResPitchDTO } from '@/types/pitch.types';
import { IMAGE_BASE_URL } from '@utils/constants';
import { formatVND } from '@utils/format/currency';
import { formatDateTime } from '@utils/format/date';
import { useAppDispatch } from '@redux/hooks';
import { useAppSelector } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';

type Props = ClientScreenProps<'PaymentQR'>;
type Nav = NativeStackNavigationProp<ClientStackParamList>;

const POLL_INTERVAL_MS = 15_000;

function resolvePitchImageUri(imageUrl?: string | null): string | null {
    const raw = imageUrl?.trim();
    if (!raw) return null;
    return raw.startsWith('http') ? raw : `${IMAGE_BASE_URL}${raw}`;
}

export default function PaymentQRScreen({ route }: Props) {
    const { bookingId } = route.params;
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<Nav>();
    const dispatch = useAppDispatch();
    const lastRealtimeEvent = useAppSelector((state) => state.realtime.lastEvent);

    const [booking, setBooking] = useState<ResBookingDTO | null>(null);
    const [pitch, setPitch] = useState<ResPitchDTO | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
    const [creating, setCreating] = useState(false);
    const [qr, setQr] = useState<ResPaymentQRDTO | null>(null);
    const [paidNotified, setPaidNotified] = useState(false);
    const [proofUri, setProofUri]           = useState<string | null>(null);
    const [uploading, setUploading]         = useState(false);
    const [proofUploaded, setProofUploaded] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    const shadowStyle = isDark ? {} : SHADOW.md;
    const pitchImageUri = resolvePitchImageUri(pitch?.pitchUrl ?? pitch?.imageUrl ?? booking?.pitchImage ?? null);

    // ── Load booking + auto-load pending QR ───────────────────────────────────
    const loadBookingAndPendingQr = useCallback(() => {
        let cancelled = false;
        setLoadingBooking(true);

        Promise.all([
            bookingService.getBookingById(bookingId),
            paymentService.getPendingByBooking(bookingId).catch(() => null),
        ])
            .then(async ([bookingRes, pendingRes]) => {
                if (cancelled) return;
                const b = bookingRes.data.data ?? null;
                setBooking(b);
                if (b?.pitchId) {
                    try {
                        const pitchRes = await pitchService.getPitchById(b.pitchId);
                        if (!cancelled) setPitch(pitchRes.data.data ?? null);
                    } catch {
                        if (!cancelled) setPitch(null);
                    }
                } else {
                    setPitch(null);
                }

                // Phục hồi QR của payment PENDING nếu có (không cần nhấn lại nút)
                const pendingQR = pendingRes?.data?.data ?? null;
                if (pendingQR?.vietQrUrl && b?.status !== 'PAID') {
                    setQr(pendingQR);
                    setMethod('BANK_TRANSFER');
                }

                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start();
            })
            .catch(() => {
                if (!cancelled) {
                    setBooking(null);
                    setPitch(null);
                }
            })
            .finally(() => { if (!cancelled) setLoadingBooking(false); });

        return () => { cancelled = true; };
    }, [bookingId]);

    useEffect(() => {
        const cleanup = loadBookingAndPendingQr();
        return cleanup;
    }, [loadBookingAndPendingQr]);

    // ── Reset paidNotified when bookingId changes ─────────────────────────────
    useEffect(() => { setPaidNotified(false); }, [bookingId]);

    // ── Detect PAID status change ─────────────────────────────────────────────
    useEffect(() => {
        if (booking?.status === 'PAID' && !paidNotified) {
            setQr(null);
            setPaidNotified(true);
            dispatch(fetchMyBookings());
            stopPolling();
        }
    }, [booking?.status, paidNotified]);

    // ── Polling ────────────────────────────────────────────────────────────────
    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const res = await bookingService.getBookingById(bookingId);
                setBooking(res.data.data ?? null);
            } catch { /* silent */ }
        }, POLL_INTERVAL_MS);
    }, [bookingId, stopPolling]);

    useEffect(() => {
        if (qr && booking?.status !== 'PAID') {
            startPolling();
        } else {
            stopPolling();
        }
        return stopPolling;
    }, [qr, booking?.status]);

    useEffect(() => {
        if (lastRealtimeEvent?.event !== 'notification') return;
        if (lastRealtimeEvent.notification.referenceId !== bookingId) return;
        const type = lastRealtimeEvent.notification.type;
        if (![
            'PAYMENT_REQUESTED',
            'PAYMENT_PROOF_UPLOADED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
            'BOOKING_APPROVED',
            'BOOKING_REJECTED',
            'BOOKING_CREATED',
            'BOOKING_PENDING_CONFIRMATION',
        ].includes(type)) {
            return;
        }

        Promise.all([
            bookingService.getBookingById(bookingId).then(async (res) => {
                const bookingData = res.data.data ?? null;
                setBooking(bookingData);
                if (bookingData?.pitchId) {
                    try {
                        const pitchRes = await pitchService.getPitchById(bookingData.pitchId);
                        setPitch(pitchRes.data.data ?? null);
                    } catch {
                        setPitch(null);
                    }
                } else {
                    setPitch(null);
                }
            }),
            paymentService.getPendingByBooking(bookingId)
                .then((res) => {
                    const pendingQR = res.data.data ?? null;
                    if (pendingQR?.vietQrUrl) {
                        setQr(pendingQR);
                        setMethod('BANK_TRANSFER');
                    } else {
                        setQr(null);
                    }
                })
                .catch(() => undefined),
        ]).catch(() => undefined);
    }, [bookingId, lastRealtimeEvent]);

    // ── Create payment ────────────────────────────────────────────────────────
    const handlePay = async () => {
        if (!booking) return;

        if (booking.status === 'PENDING') {
            Alert.alert(
                'Chưa thể thanh toán',
                'Lịch đặt đang chờ admin xác nhận. Vui lòng thử lại sau khi được duyệt.',
                [{ text: 'Đồng ý' }]
            );
            return;
        }
        if (booking.status === 'PAID') {
            Alert.alert('Đã thanh toán', 'Lịch đặt này đã được thanh toán.');
            return;
        }

        try {
            setCreating(true);
            setQr(null);

            const res = await paymentService.createPayment({ bookingId, method });
            const paymentCode = res.data.data?.paymentCode;

            if (!paymentCode) {
                Alert.alert('Lỗi', res.data.message || 'Không thể tạo thanh toán');
                return;
            }

            if (method === 'CASH') {
                Alert.alert(
                    'Thanh toán tiền mặt',
                    'Vui lòng thanh toán trực tiếp tại sân. Nhân viên sẽ xác nhận sau.',
                    [{ text: 'Đã hiểu' }]
                );
                const updated = await bookingService.getBookingById(bookingId);
                setBooking(updated.data.data ?? booking);
                return;
            }

            // Lấy (hoặc lấy lại) QR từ paymentCode — backend đã trả paymentCode dù tạo mới hay PENDING cũ
            const qrRes = await paymentService.getPaymentQR(paymentCode);
            if (!qrRes.data.data) {
                Alert.alert('Lỗi', 'Không thể tải mã QR. Vui lòng thử lại.');
                return;
            }
            setQr(qrRes.data.data);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            if (method === 'CASH' && msg === 'Thanh toán tiền mặt không hỗ trợ QR') {
                Alert.alert(
                    'Đã ghi nhận',
                    'Thanh toán tiền mặt đã được ghi nhận.',
                    [{ text: 'Đồng ý' }]
                );
                return;
            }
            Alert.alert('Thanh toán thất bại', msg || 'Vui lòng thử lại sau.');
        } finally {
            setCreating(false);
        }
    };

    // ── Copy content ──────────────────────────────────────────────────────────
    const handleCopyContent = async () => {
        if (!qr) return;
        try {
            await Share.share({ message: qr.content, title: 'Nội dung chuyển khoản' });
        } catch { /* silent */ }
    };

    // ── Proof upload ──────────────────────────────────────────────────────────
    const requestMediaPermission = async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cho phép truy cập thư viện ảnh trong Cài đặt.',
                [{ text: 'Đồng ý' }]
            );
            return false;
        }
        return true;
    };

    const requestCameraPermission = async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền camera',
                'Vui lòng cho phép truy cập camera trong Cài đặt.',
                [{ text: 'Đồng ý' }]
            );
            return false;
        }
        return true;
    };

    const pickProofImage = () => {
        Alert.alert('Chọn ảnh minh chứng', 'Chọn nguồn ảnh', [
            {
                text: 'Chụp ảnh',
                onPress: async () => {
                    if (!(await requestCameraPermission())) return;
                    const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 1,
                        allowsEditing: false,
                    });
                    if (!result.canceled && result.assets[0]) {
                        setProofUri(result.assets[0].uri);
                        setProofUploaded(false);
                    }
                },
            },
            {
                text: 'Thư viện ảnh',
                onPress: async () => {
                    if (!(await requestMediaPermission())) return;
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 1,
                        allowsEditing: false,
                    });
                    if (!result.canceled && result.assets[0]) {
                        setProofUri(result.assets[0].uri);
                        setProofUploaded(false);
                    }
                },
            },
            { text: 'Hủy', style: 'cancel' },
        ]);
    };

    const handleUploadProof = async () => {
        if (!proofUri || !qr) return;
        setUploading(true);
        try {
            const filename = proofUri.split('/').pop() ?? 'proof.jpg';
            const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

            const formData = new FormData();
            formData.append('file', { uri: proofUri, name: filename, type: mimeType } as any);
            formData.append('folder', 'payment');

            const uploadRes = await paymentService.uploadProofImage(formData);
            const proofUrl = uploadRes.data.data?.url;
            if (!proofUrl) throw new Error('Không nhận được URL ảnh');

            await paymentService.attachProof(qr.paymentId, proofUrl);
            setProofUploaded(true);
            Alert.alert('Thành công', 'Ảnh minh chứng đã được tải lên.', [{ text: 'Đồng ý' }]);
        } catch (err: any) {
            Alert.alert('Tải ảnh thất bại', err?.response?.data?.message ?? 'Vui lòng thử lại.');
        } finally {
            setUploading(false);
        }
    };

    const removeProof = () => {
        Alert.alert('Xóa ảnh', 'Bạn muốn xóa ảnh minh chứng?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: () => { setProofUri(null); setProofUploaded(false); },
            },
        ]);
    };

    const canPay = booking?.status === 'ACTIVE' || booking?.status === 'CONFIRMED';
    const isPaid = booking?.status === 'PAID';

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loadingBooking) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Đang tải thông tin...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!booking) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
                <View style={styles.centered}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                        Không tìm thấy lịch đặt
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back-outline" size={16} color="#fff" />
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
            <Animated.ScrollView
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Paid success banner ── */}
                {isPaid && (
                    <View style={[styles.successBanner, { backgroundColor: '#DCFCE7' }]}>
                        <View style={[styles.successIcon, { backgroundColor: '#16A34A' }]}>
                            <Ionicons name="checkmark" size={28} color="#fff" />
                        </View>
                        <Text style={[styles.successTitle, { color: '#15803D' }]}>
                            Thanh toán thành công
                        </Text>
                        <Text style={[styles.successSub, { color: '#16A34A' }]}>
                            Lịch đặt đã được xác nhận thanh toán
                        </Text>
                    </View>
                )}

                {/* ── Booking summary card ── */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('PitchDetail', { pitchId: booking.pitchId })}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}
                >
                    <Text style={[styles.sectionLabel, { color: colors.textHint }]}>Thông tin lịch đặt</Text>

                    {pitchImageUri ? (
                        <Image source={{ uri: pitchImageUri }} style={styles.pitchImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.pitchImageFallback, { backgroundColor: colors.surfaceVariant }]}>
                            <Ionicons name="football-outline" size={40} color={colors.textHint} />
                        </View>
                    )}

                    <View style={[styles.pitchRow, { marginTop: SPACING.md }]}>
                        <View style={[styles.pitchIconWrap, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="football-outline" size={22} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.pitchName, { color: colors.textPrimary }]}>
                                {booking.pitchName}
                            </Text>
                            <Text style={[styles.pitchSub, { color: colors.textHint }]}>
                                {formatDateTime(booking.startDateTime)} – {formatDateTime(booking.endDateTime)}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    <View style={styles.amountRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                            <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
                                <Ionicons name="cash-outline" size={14} color={colors.primary} />
                            </View>
                            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                                Tổng tiền
                            </Text>
                        </View>
                        <Text style={[styles.amountValue, { color: colors.primary }]}>
                            {formatVND(booking.totalPrice)}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* ── Already paid ── */}
                {isPaid && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                        <View style={styles.paidRow}>
                            <Ionicons name="card" size={20} color="#16A34A" />
                            <Text style={[styles.paidText, { color: '#16A34A' }]}>
                                Lịch đặt này đã được thanh toán
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Payment method selector ── */}
                {!isPaid && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>
                            Phương thức thanh toán
                        </Text>

                        <View style={{ gap: SPACING.sm }}>
                            {PAYMENT_METHOD_OPTIONS.map((opt) => {
                                const isSelected = method === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.methodOption,
                                            {
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                                            },
                                        ]}
                                        onPress={() => {
                                            if (!qr) setMethod(opt.value);
                                        }}
                                        disabled={!!qr}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.methodIconWrap, {
                                            backgroundColor: isSelected ? colors.primary : colors.border,
                                        }]}>
                                            <Ionicons
                                                name={opt.value === 'BANK_TRANSFER' ? 'qr-code-outline' : 'cash-outline'}
                                                size={16}
                                                color={isSelected ? '#fff' : colors.textHint}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.methodLabel, {
                                                color: isSelected ? colors.primary : colors.textPrimary,
                                                fontWeight: isSelected ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                                            }]}>
                                                {opt.label}
                                            </Text>
                                            {opt.value === 'BANK_TRANSFER' && (
                                                <Text style={[styles.methodSub, { color: colors.textHint }]}>
                                                    Quét mã QR để chuyển khoản
                                                </Text>
                                            )}
                                            {opt.value === 'CASH' && (
                                                <Text style={[styles.methodSub, { color: colors.textHint }]}>
                                                    Thanh toán trực tiếp tại sân
                                                </Text>
                                            )}
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {booking.status === 'PENDING' && (
                            <View style={[styles.warningBox, { backgroundColor: '#FEF3C7', marginTop: SPACING.md }]}>
                                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                                <Text style={[styles.warningText, { color: '#92400E' }]}>
                                    Lịch đặt đang chờ admin xác nhận. Bạn chỉ có thể thanh toán sau khi được duyệt.
                                </Text>
                            </View>
                        )}

                        {/* Pay button */}
                        {!qr && canPay && (
                            <TouchableOpacity
                                style={[styles.payBtn, { backgroundColor: colors.primary, marginTop: SPACING.md }]}
                                onPress={handlePay}
                                disabled={creating}
                                activeOpacity={0.85}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="card-outline" size={18} color="#fff" />
                                        <Text style={styles.payBtnText}>Tiến hành thanh toán</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── QR Code section ── */}
                {qr && method === 'BANK_TRANSFER' && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>
                            Quét mã QR để thanh toán
                        </Text>

                        {/* QR image */}
                        <View style={styles.qrWrap}>
                            <View style={[styles.qrImageContainer, { borderColor: colors.border }]}>
                                <Image
                                    source={{ uri: qr.vietQrUrl }}
                                    style={styles.qrImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>

                        {/* Bank info */}
                        <View style={[styles.bankInfo, { backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.md }]}>
                            <InfoRow icon="business-outline" label="Ngân hàng" value={qr.bankCode} colors={colors} />
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <InfoRow icon="person-outline" label="Chủ TK" value={qr.accountName} colors={colors} />
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <InfoRow icon="card-outline" label="Số TK" value={qr.accountNo} colors={colors} />
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <InfoRow icon="cash-outline" label="Số tiền" value={formatVND(qr.amount)} colors={colors} valueColor={colors.primary} valueBold />
                        </View>

                        {/* Content with copy */}
                        <View style={[styles.contentBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.contentLabel, { color: colors.textHint }]}>
                                    Nội dung chuyển khoản
                                </Text>
                                <Text style={[styles.contentValue, { color: colors.textPrimary }]}>
                                    {qr.content}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.copyBtn, { backgroundColor: colors.primaryLight }]}
                                onPress={handleCopyContent}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="share-social" size={16} color={colors.primary} />
                                <Text style={[styles.copyBtnText, { color: colors.primary }]}>Chia sẻ</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Polling status */}
                        {booking.status !== 'PAID' && (
                            <View style={[styles.pollingBox, { backgroundColor: '#EFF6FF', borderRadius: BORDER_RADIUS.md }]}>
                                <ActivityIndicator size="small" color="#3B82F6" />
                                <Text style={[styles.pollingText, { color: '#1D4ED8' }]}>
                                    Đang chờ xác nhận thanh toán...
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Proof upload section ── */}
                {qr && method === 'BANK_TRANSFER' && booking.status !== 'PAID' && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>
                            Ảnh minh chứng thanh toán
                        </Text>
                        <Text style={[styles.proofHint, { color: colors.textSecondary }]}>
                            Không bắt buộc — có thể upload sau khi chuyển khoản để admin xác nhận nhanh hơn.
                        </Text>

                        {!proofUri ? (
                            /* Chưa chọn ảnh → nút chọn ảnh */
                            <TouchableOpacity
                                style={[styles.pickImageBtn, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
                                onPress={pickProofImage}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="camera-outline" size={22} color={colors.textHint} />
                                <Text style={[styles.pickImageText, { color: colors.textSecondary }]}>
                                    Chọn hoặc chụp ảnh
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            /* Đã chọn ảnh → preview + nút xóa / upload */
                            <View style={styles.proofPreviewWrap}>
                                {/* Tap ảnh → mở preview fullscreen */}
                                <TouchableOpacity onPress={() => setPreviewVisible(true)} activeOpacity={0.9}>
                                    <Image
                                        source={{ uri: proofUri }}
                                        style={[styles.proofPreview, { borderColor: colors.border }]}
                                        resizeMode="cover"
                                    />
                                    {/* badge phóng to */}
                                    <View style={[styles.changePhotoBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                                        <Ionicons name="expand-outline" size={12} color="#fff" />
                                        <Text style={styles.changePhotoText}>Xem</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Nút đổi ảnh riêng */}
                                <TouchableOpacity
                                    style={[styles.changePhotoBtn, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
                                    onPress={pickProofImage}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="camera-outline" size={15} color={colors.textSecondary} />
                                    <Text style={[styles.changePhotoBtnText, { color: colors.textSecondary }]}>
                                        Đổi ảnh
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.proofActions}>
                                    {proofUploaded ? (
                                        <View style={[styles.uploadedBadge, { backgroundColor: '#DCFCE7' }]}>
                                            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                                            <Text style={[styles.uploadedText, { color: '#15803D' }]}>
                                                Đã tải lên thành công
                                            </Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                                            onPress={handleUploadProof}
                                            disabled={uploading}
                                            activeOpacity={0.85}
                                        >
                                            {uploading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                                                    <Text style={styles.uploadBtnText}>Tải lên</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.removeBtn, { borderColor: colors.border }]}
                                        onPress={removeProof}
                                        disabled={uploading}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={15} color={colors.textHint} />
                                        <Text style={[styles.removeBtnText, { color: colors.textHint }]}>Xóa</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Instructions ── */}
                {qr && method === 'BANK_TRANSFER' && booking.status !== 'PAID' && (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadowStyle }]}>
                        <Text style={[styles.sectionLabel, { color: colors.textHint }]}>Hướng dẫn</Text>
                        {[
                            'Mở ứng dụng ngân hàng của bạn',
                            'Chọn "Quét QR" hoặc "Chuyển khoản"',
                            'Quét mã QR hoặc nhập thông tin thủ công',
                            'Nhập đúng nội dung chuyển khoản',
                            'Xác nhận và hoàn tất thanh toán',
                            'Hệ thống sẽ tự động xác nhận trong vài phút',
                        ].map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={[styles.stepNum, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.stepNumText, { color: colors.primary }]}>
                                        {i + 1}
                                    </Text>
                                </View>
                                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                                    {step}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.ScrollView>

            {/* ── Full-screen image preview modal ── */}
            {proofUri && (
                <Modal
                    visible={previewVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setPreviewVisible(false)}
                >
                    <View style={previewStyles.overlay}>
                        <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />

                        {/* Header */}
                        <View style={previewStyles.header}>
                            <Text style={previewStyles.headerTitle}>Ảnh minh chứng</Text>
                            <TouchableOpacity
                                style={previewStyles.closeBtn}
                                onPress={() => setPreviewVisible(false)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Ionicons name="close" size={26} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Image — fills remaining space */}
                        <View style={previewStyles.imageWrap}>
                            <Image
                                source={{ uri: proofUri }}
                                style={previewStyles.fullImage}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Bottom actions */}
                        <View style={previewStyles.footer}>
                            <TouchableOpacity
                                style={[previewStyles.footerBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                                onPress={() => { setPreviewVisible(false); pickProofImage(); }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="camera-outline" size={18} color="#fff" />
                                <Text style={previewStyles.footerBtnText}>Đổi ảnh</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[previewStyles.footerBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                                onPress={() => setPreviewVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                                <Text style={previewStyles.footerBtnText}>Đóng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

// ── Helper component ──────────────────────────────────────────────────────────
function InfoRow({
    icon,
    label,
    value,
    valueColor,
    valueBold,
    colors,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    valueColor?: string;
    valueBold?: boolean;
    colors: any;
}) {
    return (
        <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={icon} size={13} color={colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text
                style={[
                    styles.infoValue,
                    { color: valueColor ?? colors.textPrimary },
                    valueBold && { fontWeight: FONT_WEIGHT.semibold },
                ]}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1 },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        gap: SPACING.lg,
    },
    loadingText: { fontSize: FONT_SIZE.sm, marginTop: SPACING.sm },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.sm,
    },
    backBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

    // Card
    card: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.lg,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    divider: { height: 1, marginVertical: SPACING.xs },

    // Success banner
    successBanner: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.sm,
    },
    successIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    successTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    successSub: { fontSize: FONT_SIZE.sm, textAlign: 'center' },

    // Paid row
    paidRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    paidText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

    // Booking summary
    pitchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
    pitchImage: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: BORDER_RADIUS.md,
    },
    pitchImageFallback: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pitchIconWrap: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pitchName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
    pitchSub: { fontSize: FONT_SIZE.xs, marginTop: 2 },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
    },
    amountLabel: { fontSize: FONT_SIZE.sm },
    amountValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    rowIcon: {
        width: 26,
        height: 26,
        borderRadius: BORDER_RADIUS.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Method selector
    methodOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1.5,
        minHeight: 60,
    },
    methodIconWrap: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodLabel: { fontSize: FONT_SIZE.md },
    methodSub: { fontSize: FONT_SIZE.xs, marginTop: 2 },

    warningBox: {
        flexDirection: 'row',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'flex-start',
    },
    warningText: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 18 },

    // Pay button
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        minHeight: 52,
    },
    payBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

    // QR
    qrWrap: { alignItems: 'center', marginBottom: SPACING.lg },
    qrImageContainer: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        backgroundColor: '#fff',
    },
    qrImage: { width: 220, height: 220 },

    bankInfo: { padding: SPACING.md, marginBottom: SPACING.md },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    infoIconWrap: {
        width: 26,
        height: 26,
        borderRadius: BORDER_RADIUS.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: { width: 80, fontSize: FONT_SIZE.sm },
    infoValue: { flex: 1, fontSize: FONT_SIZE.sm, textAlign: 'right' },

    contentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.md,
    },
    contentLabel: { fontSize: FONT_SIZE.xs, marginBottom: 2 },
    contentValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        minHeight: 44,
    },
    copyBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

    pollingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
    },
    pollingText: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 18 },

    // Proof upload
    proofHint: { fontSize: FONT_SIZE.xs, lineHeight: 18, marginBottom: SPACING.md },
    pickImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.xl,
        minHeight: 80,
    },
    pickImageText: { fontSize: FONT_SIZE.sm },

    proofPreviewWrap: { gap: SPACING.md },
    proofPreview: {
        width: '100%',
        height: 180,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
    },
    changePhotoBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    changePhotoText: { color: '#fff', fontSize: 11, fontWeight: FONT_WEIGHT.semibold },

    changePhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        minHeight: 36,
    },
    changePhotoBtnText: { fontSize: FONT_SIZE.sm },

    proofActions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
    uploadedBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    uploadedText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
    uploadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        minHeight: 44,
    },
    uploadBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        minHeight: 44,
    },
    removeBtnText: { fontSize: FONT_SIZE.sm },

    // Instructions
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        paddingVertical: 5,
    },
    stepNum: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumText: { fontSize: 11, fontWeight: FONT_WEIGHT.bold },
    stepText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20 },
});

// ── Preview modal styles ──────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const previewStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.96)',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        color: '#fff',
        fontSize: FONT_SIZE.lg,
        fontWeight: FONT_WEIGHT.semibold,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullImage: {
        width: SCREEN_W,
        height: SCREEN_H * 0.72,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    },
    footerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        minHeight: 48,
    },
    footerBtnText: {
        color: '#fff',
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.semibold,
    },
});
