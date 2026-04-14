import { useCallback, useState } from 'react';
import { bookingService } from '@services/booking.service';
import { ReqCreateBookingDTO } from '@/types/booking.types';
import { useAppDispatch } from '@redux/hooks';
import { fetchMyBookings } from '@redux/slices/bookingSlice';

export function useBooking() {
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createBooking = useCallback(
        async (data: ReqCreateBookingDTO) => {
            setLoading(true);
            setError(null);
            try {
                const res = await bookingService.createBooking(data);
                await dispatch(fetchMyBookings());
                return res.data.data;
            } catch (err: any) {
                const msg = err?.response?.data?.message ?? 'Đặt sân thất bại';
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [dispatch],
    );

    return { createBooking, loading, error };
}
