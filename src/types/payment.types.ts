export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VNPAY' | 'BALANCE';

export interface ReqCreatePaymentDTO {
    bookingId: number;
    method: PaymentMethod;
}

export interface ReqConfirmPaymentDTO {
    transactionCode?: string;
}

export interface ResPaymentDTO {
    id: number;
    bookingId: number;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionCode: string | null;
    paidAt: string | null;
    createdAt: string;
}

export interface ResPaymentQRDTO {
    paymentId: number;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    description: string;
    qrImageUrl: string;
}
