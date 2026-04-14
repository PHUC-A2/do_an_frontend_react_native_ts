import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pitchService } from '@services/pitch.service';
import { ResPitchDTO } from '@/types/pitch.types';
import { AxiosError } from 'axios';

interface PitchState {
    pitches: ResPitchDTO[];
    selectedPitch: ResPitchDTO | null;
    total: number;
    page: number;
    isLoading: boolean;
    error: string | null;
}

const initialState: PitchState = {
    pitches: [],
    selectedPitch: null,
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
};

export const fetchPitches = createAsyncThunk(
    'pitch/fetchAll',
    async (params: { page?: number; size?: number; type?: string } | undefined, { rejectWithValue }) => {
        try {
            const res = await pitchService.getPitches(params);
            return res.data.data!;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Lỗi tải danh sách sân');
        }
    },
);

export const fetchPitchById = createAsyncThunk(
    'pitch/fetchById',
    async (id: number, { rejectWithValue }) => {
        try {
            const res = await pitchService.getPitchById(id);
            return res.data.data!;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Lỗi tải thông tin sân');
        }
    },
);

const pitchSlice = createSlice({
    name: 'pitch',
    initialState,
    reducers: {
        setSelectedPitch(state, action: PayloadAction<ResPitchDTO | null>) {
            state.selectedPitch = action.payload;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPitches.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPitches.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pitches = action.payload.result;
                state.total = action.payload.meta.total;
                state.page = action.payload.meta.page;
            })
            .addCase(fetchPitches.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchPitchById.fulfilled, (state, action) => {
                state.selectedPitch = action.payload;
            });
    },
});

export const { setSelectedPitch, clearError } = pitchSlice.actions;
export default pitchSlice.reducer;
