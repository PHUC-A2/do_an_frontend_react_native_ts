import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ReqCreatePaymentDTO,
    ResCreatePaymentDTO,
    ResPaymentDTO,
    ResPaymentQRDTO,
} from '@/types/payment.types';
import { RestResponse } from '@/types/common.types';

export const paymentService = {
    createPayment: (data: ReqCreatePaymentDTO) =>
        api.post<RestResponse<ResCreatePaymentDTO>>(ENDPOINTS.PAYMENTS.CREATE, data),

    getPaymentQR: (paymentCode: string) =>
        api.get<RestResponse<ResPaymentQRDTO>>(ENDPOINTS.PAYMENTS.QR(paymentCode)),

    /** Lấy QR của payment PENDING theo bookingId — phục hồi khi reload/reopen */
    getPendingByBooking: (bookingId: number) =>
        api.get<RestResponse<ResPaymentQRDTO | null>>(ENDPOINTS.PAYMENTS.PENDING_BY_BOOKING(bookingId)),

    /** proofUrl gửi qua query param — giống web */
    attachProof: (paymentId: number, proofUrl: string) =>
        api.patch<RestResponse<null>>(
            ENDPOINTS.PAYMENTS.ATTACH_PROOF(paymentId),
            null,
            { params: { proofUrl } }
        ),

    /** Upload ảnh minh chứng — cùng endpoint với web: POST /files/upload + folder=payment */
    uploadProofImage: (formData: FormData) =>
        api.post<RestResponse<{ url: string }>>(ENDPOINTS.FILES.UPLOAD, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getMyPayments: () =>
        api.get<RestResponse<ResPaymentDTO[]>>(ENDPOINTS.PAYMENTS.MY),
};
