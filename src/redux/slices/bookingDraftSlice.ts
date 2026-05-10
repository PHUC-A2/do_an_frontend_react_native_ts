import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface BookingDraft {
    pitchId: number;
    startTime: string;
    endTime: string;
    phone?: string;
    borrowNote?: string;
    borrowConditionAcknowledged?: boolean;
    borrowReportPrintOptIn?: boolean;
    rowOn?: Record<number, boolean>;
    quantities?: Record<number, number>;
    rowNotes?: Record<number, string>;
}

interface BookingDraftState {
    draft: BookingDraft | null;
}

const initialState: BookingDraftState = {
    draft: null,
};

const bookingDraftSlice = createSlice({
    name: 'bookingDraft',
    initialState,
    reducers: {
        /**
         * Lưu booking draft khi user chưa đăng nhập.
         * Gọi này trước khi navigate('Auth')
         */
        saveBookingDraft(state, action: PayloadAction<BookingDraft>) {
            state.draft = action.payload;
        },
        /**
         * Xóa draft sau khi booking thành công hoặc user huỷ
         */
        clearBookingDraft(state) {
            state.draft = null;
        },
    },
});

export const { saveBookingDraft, clearBookingDraft } = bookingDraftSlice.actions;
export default bookingDraftSlice.reducer;
