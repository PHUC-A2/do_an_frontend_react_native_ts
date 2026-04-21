import { BookingStatus } from '@/types/booking.types';
import { PaymentStatus } from '@/types/payment.types';
import { PitchStatus, PitchType } from '@/types/pitch.types';
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

export const PITCH_TYPE_LABEL: Record<PitchType, string> = {
    THREE: 'Sân 3',
    FIVE: 'Sân 5',
    SEVEN: 'Sân 7',
    ELEVEN: 'Sân 11',
};

export const DEFAULT_PAGE_SIZE = 10;

export const IMAGE_BASE_URL = ENV.API_BASE_URL.replace('/api/v1', '');
