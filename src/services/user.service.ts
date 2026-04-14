import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResUserListDTO, ResUserDetailDTO } from '@/types/user.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const userService = {
    getUsers: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResUserListDTO>>>(ENDPOINTS.USERS.LIST, { params }),

    getUserById: (id: number) =>
        api.get<RestResponse<ResUserDetailDTO>>(ENDPOINTS.USERS.DETAIL(id)),

    updateUserStatus: (id: number, data: { status: string; reason?: string }) =>
        api.patch<RestResponse<ResUserDetailDTO>>(ENDPOINTS.USERS.STATUS(id), data),
};
