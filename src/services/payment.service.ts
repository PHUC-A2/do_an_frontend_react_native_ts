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

    attachProof: (paymentId: number, proofUrl: string) =>
        api.patch<RestResponse<null>>(ENDPOINTS.PAYMENTS.ATTACH_PROOF(paymentId), { proofUrl }),

    uploadProofImage: (formData: FormData) =>
        api.post<RestResponse<{ url: string }>>('/client/payments/upload-proof', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getMyPayments: () =>
        api.get<RestResponse<ResPaymentDTO[]>>(ENDPOINTS.PAYMENTS.MY),
};
