import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ResNotificationDTO } from '@/types/notification.types';

export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

/** Payload gửi vào `pushRealtimeEvent` (không dùng `Omit<RealtimeEvent,'seq'>` trên union — TS phân phối sai). */
export type RealtimeEventPayload =
    | { event: 'notification'; notification: ResNotificationDTO; receivedAt: number }
    | { event: 'ring'; receivedAt: number }
    | { event: 'connected' | 'pong'; receivedAt: number }
    | { event: 'pitch_reviews_updated'; pitchId: number; receivedAt: number };

export type RealtimeEvent = { seq: number } & RealtimeEventPayload;

interface RealtimeState {
    connectionState: RealtimeConnectionState;
    lastEvent: RealtimeEvent | null;
}

const initialState: RealtimeState = {
    connectionState: 'idle',
    lastEvent: null,
};

const realtimeSlice = createSlice({
    name: 'realtime',
    initialState,
    reducers: {
        setRealtimeConnectionState(state, action: PayloadAction<RealtimeConnectionState>) {
            state.connectionState = action.payload;
        },
        pushRealtimeEvent(state, action: PayloadAction<RealtimeEventPayload>) {
            const nextSeq = (state.lastEvent?.seq ?? 0) + 1;
            state.lastEvent = { ...action.payload, seq: nextSeq };
        },
        clearRealtimeState(state) {
            state.connectionState = 'idle';
            state.lastEvent = null;
        },
    },
});

export const { setRealtimeConnectionState, pushRealtimeEvent, clearRealtimeState } = realtimeSlice.actions;
export default realtimeSlice.reducer;
