import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ResNotificationDTO } from '@/types/notification.types';

export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

export type RealtimeEvent =
    | { seq: number; event: 'notification'; notification: ResNotificationDTO; receivedAt: number }
    | { seq: number; event: 'ring'; receivedAt: number }
    | { seq: number; event: 'connected' | 'pong'; receivedAt: number };

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
        pushRealtimeEvent(state, action: PayloadAction<Omit<RealtimeEvent, 'seq'>>) {
            const nextSeq = (state.lastEvent?.seq ?? 0) + 1;
            state.lastEvent = { ...action.payload, seq: nextSeq } as RealtimeEvent;
        },
        clearRealtimeState(state) {
            state.connectionState = 'idle';
            state.lastEvent = null;
        },
    },
});

export const { setRealtimeConnectionState, pushRealtimeEvent, clearRealtimeState } = realtimeSlice.actions;
export default realtimeSlice.reducer;
