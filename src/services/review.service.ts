import api from './api';
import { ENDPOINTS } from '@config/api.config';
import { ResReviewDTO, ReqCreateReviewDTO } from '@/types/equipment.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const reviewService = {
    getMyReviews: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResReviewDTO>>>(ENDPOINTS.REVIEWS.MY, { params }),

    createReview: (data: ReqCreateReviewDTO) =>
        api.post<RestResponse<ResReviewDTO>>(ENDPOINTS.REVIEWS.CREATE, data),

    getReviewById: (id: number) =>
        api.get<RestResponse<ResReviewDTO>>(ENDPOINTS.REVIEWS.DETAIL(id)),

    // Admin
    adminGetReviews: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResReviewDTO>>>(ENDPOINTS.REVIEWS.LIST, { params }),
};
