import { BookingStatus } from '@/types/booking.types';
import { PaymentStatus } from '@/types/payment.types';
import { PitchStatus } from '@/types/pitch.types';
import { ENV } from '@config/env';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
    PENDING: 'Chờ xác nhận',
    ACTIVE: 'Đã xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PAID: 'Đã thanh toán',
    CHECKIN: 'Đang diễn ra',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    NO_SHOW: 'Vắng mặt',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Thất bại',
    REFUNDED: 'Đã hoàn tiền',
    CANCELLED: 'Đã hủy',
};

export const PITCH_STATUS_LABEL: Record<PitchStatus, string> = {
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Không hoạt động',
    MAINTENANCE: 'Bảo trì',
};

export const getPitchTypeLabel = (pitchTypeName?: string | null) =>
    pitchTypeName?.trim() || 'Chưa phân loại';

export const DEFAULT_PAGE_SIZE = 10;

export const IMAGE_BASE_URL = ENV.API_BASE_URL.replace('/api/v1', '');
