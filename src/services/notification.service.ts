import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResNotificationDTO } from '@/types/notification.types';
import { RestResponse } from '@/types/common.types';

export const notificationService = {
    // GET /client/notifications → trả về mảng trực tiếp (không paginate)
    getMyNotifications: () =>
        api.get<RestResponse<ResNotificationDTO[]>>(ENDPOINTS.NOTIFICATIONS.MY),

    markAsRead: (id: number) =>
        api.patch<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.READ(id)),

    markAllAsRead: () =>
        api.patch<RestResponse<null>>(ENDPOINTS.NOTIFICATIONS.READ_ALL),
};
