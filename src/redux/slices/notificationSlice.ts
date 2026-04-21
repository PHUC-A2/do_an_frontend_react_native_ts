import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationService } from '@services/notification.service';
import { ResNotificationDTO } from '@/types/notification.types';

interface NotificationState {
    notifications: ResNotificationDTO[];
    unreadCount: number;
    isLoading: boolean;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
};

export const fetchNotifications = createAsyncThunk('notification/fetchAll', async () => {
    const res = await notificationService.getMyNotifications();
    return res.data.data ?? [];
});

export const markReadAsync = createAsyncThunk('notification/markRead', async (id: number) => {
    await notificationService.markAsRead(id);
    return id;
});

export const markAllReadAsync = createAsyncThunk('notification/markAllRead', async () => {
    await notificationService.markAllAsRead();
});

export const deleteNotificationAsync = createAsyncThunk('notification/deleteOne', async (id: number) => {
    await notificationService.deleteOne(id);
    return id;
});

export const deleteAllNotificationsAsync = createAsyncThunk('notification/deleteAll', async () => {
    await notificationService.deleteAll();
});

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        incrementUnread(state) {
            state.unreadCount += 1;
        },
        prependNotification(state, action: PayloadAction<ResNotificationDTO>) {
            state.notifications.unshift(action.payload);
            state.unreadCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notifications = action.payload;
                // Tính unreadCount trực tiếp từ danh sách
                state.unreadCount = action.payload.filter((n) => !n.isRead).length;
            })
            .addCase(fetchNotifications.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(markReadAsync.fulfilled, (state, action) => {
                const n = state.notifications.find((n) => n.id === action.payload);
                if (n && !n.isRead) {
                    n.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            .addCase(markAllReadAsync.fulfilled, (state) => {
                state.notifications.forEach((n) => (n.isRead = true));
                state.unreadCount = 0;
            })
            .addCase(deleteNotificationAsync.fulfilled, (state, action) => {
                state.notifications = state.notifications.filter((n) => n.id !== action.payload);
                state.unreadCount = state.notifications.filter((n) => !n.isRead).length;
            })
            .addCase(deleteAllNotificationsAsync.fulfilled, (state) => {
                state.notifications = [];
                state.unreadCount = 0;
            });
    },
});

export const { incrementUnread, prependNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
