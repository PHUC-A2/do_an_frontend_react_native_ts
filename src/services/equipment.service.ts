import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResEquipmentDTO } from '@/types/equipment.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const equipmentService = {
    getPublicEquipment: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResEquipmentDTO>>>(ENDPOINTS.EQUIPMENT.PUBLIC, {
            params,
        }),

    // Admin
    adminGetEquipment: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResEquipmentDTO>>>(ENDPOINTS.EQUIPMENT.LIST, {
            params,
        }),

    getEquipmentById: (id: number) =>
        api.get<RestResponse<ResEquipmentDTO>>(ENDPOINTS.EQUIPMENT.DETAIL(id)),
};
