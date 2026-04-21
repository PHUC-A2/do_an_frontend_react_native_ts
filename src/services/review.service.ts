import api from './api';
import { ENDPOINTS } from '@config/api.config';
import type {
    ReqCreateReviewDTO,
    ReqReviewMessageDTO,
    ResReviewDTO,
    ResReviewMessageDTO,
} from '@/types/review.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const reviewService = {
    getMyReviews: () => api.get<RestResponse<ResReviewDTO[]>>(ENDPOINTS.REVIEWS.MY),

    createReview: (data: ReqCreateReviewDTO) =>
        api.post<RestResponse<ResReviewDTO>>(ENDPOINTS.REVIEWS.CREATE, data),

    getReviewById: (id: number) => api.get<RestResponse<ResReviewDTO>>(ENDPOINTS.REVIEWS.DETAIL(id)),

    getMessages: (reviewId: number) =>
        api.get<RestResponse<ResReviewMessageDTO[]>>(ENDPOINTS.REVIEWS.MESSAGES(reviewId)),

    sendMessage: (reviewId: number, data: ReqReviewMessageDTO) =>
        api.post<RestResponse<ResReviewMessageDTO>>(ENDPOINTS.REVIEWS.MESSAGES(reviewId), data),

    adminGetReviews: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResReviewDTO>>>(ENDPOINTS.REVIEWS.LIST, { params }),
};
