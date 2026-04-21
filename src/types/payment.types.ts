export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface ReqCreatePaymentDTO {
    bookingId: number;
    method: PaymentMethod;
}

export interface ResPaymentDTO {
    id: number;
    bookingId: number;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paymentCode: string | null;
    transactionCode: string | null;
    paidAt: string | null;
    createdAt: string;
}

/** Response from POST /client/payments — chỉ trả về paymentCode */
export interface ResCreatePaymentDTO {
    paymentCode: string;
    paymentId?: number;
}

/** Response from GET /client/payments/{paymentCode}/qr */
export interface ResPaymentQRDTO {
    paymentId: number;
    paymentCode: string;
    bankCode: string;
    accountNo: string;
    accountName: string;
    amount: number;
    content: string;
    vietQrUrl: string;
}

export const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: 'Chuyển khoản ngân hàng', value: 'BANK_TRANSFER' },
    { label: 'Tiền mặt tại sân', value: 'CASH' },
];
