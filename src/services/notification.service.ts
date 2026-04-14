import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResNotificationDTO } from '@/types/notification.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const notificationService = {
    getMyNotifications: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResNotificationDTO>>>(ENDPOINTS.NOTIFICATIONS.MY, {
            params,
        }),

    markAsRead: (id: number) =>
        api.patch<RestResponse<ResNotificationDTO>>(ENDPOINTS.NOTIFICATIONS.READ(id)),

    markAllAsRead: () =>
        api.patch<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.READ_ALL),

    getUnreadCount: () =>
        api.get<RestResponse<{ count: number }>>(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT),
};
