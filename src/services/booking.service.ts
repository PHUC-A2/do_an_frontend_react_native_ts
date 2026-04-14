import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ReqCreateBookingDTO,
    ReqUpdateBookingDTO,
    ResBookingDTO,
    ResCreateBookingDTO,
    ResPitchTimelineDTO,
} from '@/types/booking.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const bookingService = {
    createBooking: (data: ReqCreateBookingDTO) =>
        api.post<RestResponse<ResCreateBookingDTO>>(ENDPOINTS.BOOKINGS.CREATE, data),

    getMyBookings: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResBookingDTO>>>(ENDPOINTS.BOOKINGS.MY, { params }),

    getBookingById: (id: number) =>
        api.get<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.DETAIL(id)),

    cancelBooking: (id: number) =>
        api.post<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.CANCEL(id)),

    // Admin
    getAllBookings: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResBookingDTO>>>(ENDPOINTS.BOOKINGS.ALL, { params }),

    updateBooking: (id: number, data: ReqUpdateBookingDTO) =>
        api.patch<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.UPDATE(id), data),

    getPitchTimeline: (pitchId: number, date: string) =>
        api.get<RestResponse<ResPitchTimelineDTO>>(ENDPOINTS.PITCHES.TIMELINE(pitchId), {
            params: { date },
        }),
};
