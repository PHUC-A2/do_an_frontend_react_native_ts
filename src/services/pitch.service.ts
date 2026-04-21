import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ResPitchDTO,
    ReqCreatePitchDTO,
    ReqUpdatePitchDTO,
} from '@/types/pitch.types';
import type { ResReviewDTO } from '@/types/review.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const pitchService = {
    getPitches: (params?: PaginationParams & { type?: string; status?: string; keyword?: string }) =>
        api.get<RestResponse<ResultPaginationDTO<ResPitchDTO>>>(ENDPOINTS.PITCHES.PUBLIC, { params }),

    getPitchById: (id: number) =>
        api.get<RestResponse<ResPitchDTO>>(ENDPOINTS.PITCHES.DETAIL(id)),

    getPublicPitchReviews: (id: number) =>
        api.get<RestResponse<ResReviewDTO[]>>(ENDPOINTS.PITCHES.PUBLIC_REVIEWS(id)),

    // Admin
    adminGetPitches: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResPitchDTO>>>(ENDPOINTS.PITCHES.LIST, { params }),

    createPitch: (data: ReqCreatePitchDTO) =>
        api.post<RestResponse<ResPitchDTO>>(ENDPOINTS.PITCHES.LIST, data),

    updatePitch: (id: number, data: ReqUpdatePitchDTO) =>
        api.patch<RestResponse<ResPitchDTO>>(ENDPOINTS.PITCHES.DETAIL(id), data),

    deletePitch: (id: number) =>
        api.delete<RestResponse<null>>(ENDPOINTS.PITCHES.DETAIL(id)),
};
