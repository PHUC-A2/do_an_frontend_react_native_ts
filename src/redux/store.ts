import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountReducer from './slices/accountSlice';
import bookingReducer from './slices/bookingSlice';
import pitchReducer from './slices/pitchSlice';
import pitchSearchReducer from './slices/pitchSearchSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        account: accountReducer,
        booking: bookingReducer,
        pitch: pitchReducer,
        pitchSearch: pitchSearchReducer,
        notification: notificationReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
