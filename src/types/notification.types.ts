export type NotificationType =
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_COMPLETED'
    | 'PAYMENT_SUCCESS'
    | 'PAYMENT_FAILED'
    | 'REVIEW_REPLY'
    | 'SYSTEM';

export interface ResNotificationDTO {
    id: number;
    title: string;
    body: string;
    type: NotificationType;
    referenceId: number | null;
    isRead: boolean;
    createdAt: string;
}
