import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bookingService } from '@services/booking.service';
import { ResBookingDTO, ResCreateBookingDTO, ReqCreateBookingDTO } from '@/types/booking.types';
import { ResultPaginationDTO } from '@/types/common.types';
import { AxiosError } from 'axios';

interface BookingState {
    myBookings: ResBookingDTO[];
    allBookings: ResBookingDTO[];
    selectedBooking: ResBookingDTO | null;
    pagination: ResultPaginationDTO<ResBookingDTO>['meta'] | null;
    isLoading: boolean;
    isCreating: boolean;
    error: string | null;
}

const initialState: BookingState = {
    myBookings: [],
    allBookings: [],
    selectedBooking: null,
    pagination: null,
    isLoading: false,
    isCreating: false,
    error: null,
};

export const fetchMyBookings = createAsyncThunk(
    'booking/fetchMy',
    async (params: { page?: number; size?: number } | undefined, { rejectWithValue }) => {
        try {
            const res = await bookingService.getMyBookings(params);
            return res.data.data!;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Lỗi tải danh sách đặt sân');
        }
    },
);

export const createBookingAsync = createAsyncThunk(
    'booking/create',
    async (data: ReqCreateBookingDTO, { rejectWithValue }) => {
        try {
            const res = await bookingService.createBooking(data);
            return res.data.data as ResCreateBookingDTO;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Lỗi đặt sân');
        }
    },
);

export const cancelBookingAsync = createAsyncThunk(
    'booking/cancel',
    async (id: number, { rejectWithValue }) => {
        try {
            const res = await bookingService.cancelBooking(id);
            return res.data.data!;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Lỗi hủy đặt sân');
        }
    },
);

const bookingSlice = createSlice({
    name: 'booking',
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedBooking(state, action: PayloadAction<ResBookingDTO | null>) {
            state.selectedBooking = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyBookings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMyBookings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myBookings = action.payload.result;
                state.pagination = action.payload.meta;
            })
            .addCase(fetchMyBookings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(createBookingAsync.pending, (state) => {
                state.isCreating = true;
                state.error = null;
            })
            .addCase(createBookingAsync.fulfilled, (state) => {
                state.isCreating = false;
            })
            .addCase(createBookingAsync.rejected, (state, action) => {
                state.isCreating = false;
                state.error = action.payload as string;
            })

            .addCase(cancelBookingAsync.fulfilled, (state, action) => {
                const idx = state.myBookings.findIndex((b) => b.id === action.payload.id);
                if (idx !== -1) state.myBookings[idx] = action.payload;
            });
    },
});

export const { clearError, setSelectedBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
