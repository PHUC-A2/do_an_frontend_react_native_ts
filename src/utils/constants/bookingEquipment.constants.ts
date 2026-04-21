import { BookingEquipmentStatus } from '@/types/bookingEquipment.types';

export const BOOKING_EQUIPMENT_STATUS_META: Record<
    BookingEquipmentStatus,
    { label: string; color: string; bgColor: string }
> = {
    BORROWED: {
        label: 'Đang mượn',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
    },
    RETURNED: {
        label: 'Đã trả',
        color: '#16A34A',
        bgColor: '#DCFCE7',
    },
    LOST: {
        label: 'Đã mất',
        color: '#EF4444',
        bgColor: '#FEE2E2',
    },
    DAMAGED: {
        label: 'Bị hỏng',
        color: '#F97316',
        bgColor: '#FFEDD5',
    },
};
