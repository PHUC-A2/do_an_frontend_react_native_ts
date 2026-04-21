import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ReqCreateBookingDTO,
    ReqUpdateBookingDTO,
    ResBookingDTO,
    ResCreateBookingDTO,
    ResPitchTimelineDTO,
} from '@/types/booking.types';
import { ResBookingEquipmentDTO, ReqUpdateBookingEquipmentStatusDTO } from '@/types/bookingEquipment.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const bookingService = {
    createBooking: (data: ReqCreateBookingDTO) =>
        api.post<RestResponse<ResCreateBookingDTO>>(ENDPOINTS.BOOKINGS.CREATE, data),

    getMyBookings: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResBookingDTO>>>(ENDPOINTS.BOOKINGS.MY, { params }),

    getBookingById: (id: number) =>
        api.get<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.DETAIL(id)),

    cancelBooking: (id: number) =>
        api.patch<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.CANCEL(id)),

    deleteBooking: (id: number) =>
        api.delete<RestResponse<void>>(ENDPOINTS.BOOKINGS.DELETE(id)),

    // Admin
    getAllBookings: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResBookingDTO>>>(ENDPOINTS.BOOKINGS.ALL, { params }),

    updateBooking: (id: number, data: ReqUpdateBookingDTO) =>
        api.patch<RestResponse<ResBookingDTO>>(ENDPOINTS.BOOKINGS.UPDATE(id), data),

    getPitchTimeline: (pitchId: number, date: string) =>
        api.get<RestResponse<ResPitchTimelineDTO>>(ENDPOINTS.PITCHES.TIMELINE(pitchId), {
            params: { date },
        }),

    // Equipment
    getAllMyEquipments: () =>
        api.get<RestResponse<ResBookingEquipmentDTO[]>>(ENDPOINTS.BOOKING_EQUIPMENT.MY),

    getBookingEquipments: (bookingId: number) =>
        api.get<RestResponse<ResBookingEquipmentDTO[]>>(ENDPOINTS.BOOKING_EQUIPMENT.BY_BOOKING(bookingId)),

    updateEquipmentStatus: (id: number, data: ReqUpdateBookingEquipmentStatusDTO) =>
        api.patch<RestResponse<ResBookingEquipmentDTO>>(ENDPOINTS.BOOKING_EQUIPMENT.UPDATE_STATUS(id), data),

    deleteBookingEquipment: (id: number) =>
        api.delete<RestResponse<void>>(ENDPOINTS.BOOKING_EQUIPMENT.DELETE(id)),
};
