import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ReqCreatePaymentDTO,
    ReqConfirmPaymentDTO,
    ResPaymentDTO,
    ResPaymentQRDTO,
} from '@/types/payment.types';
import { RestResponse, ResultPaginationDTO, PaginationParams } from '@/types/common.types';

export const paymentService = {
    createPayment: (data: ReqCreatePaymentDTO) =>
        api.post<RestResponse<ResPaymentDTO>>(ENDPOINTS.PAYMENTS.CREATE, data),

    getPaymentQR: (id: number) =>
        api.get<RestResponse<ResPaymentQRDTO>>(ENDPOINTS.PAYMENTS.QR(id)),

    confirmPayment: (id: number, data: ReqConfirmPaymentDTO) =>
        api.post<RestResponse<ResPaymentDTO>>(ENDPOINTS.PAYMENTS.CONFIRM(id), data),

    getMyPayments: (params?: PaginationParams) =>
        api.get<RestResponse<ResultPaginationDTO<ResPaymentDTO>>>(ENDPOINTS.PAYMENTS.MY, { params }),
};
