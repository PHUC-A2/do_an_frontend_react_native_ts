export type NotificationType =
    | 'BOOKING_CREATED'
    | 'BOOKING_PENDING_CONFIRMATION'
    | 'BOOKING_APPROVED'
    | 'BOOKING_REJECTED'
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_COMPLETED'
    | 'EQUIPMENT_BORROWED'
    | 'EQUIPMENT_RETURNED'
    | 'EQUIPMENT_LOST'
    | 'EQUIPMENT_DAMAGED'
    | 'PAYMENT_REQUESTED'
    | 'PAYMENT_PROOF_UPLOADED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_SUCCESS'
    | 'PAYMENT_FAILED'
    | 'MATCH_REMINDER'
    | 'AI_KEY_EXPIRED'
    | 'REVIEW_REPLY'
    | 'SYSTEM';

export interface ResNotificationDTO {
    id: number;
    title?: string | null;
    body?: string | null;
    message?: string | null;
    type: NotificationType;
    referenceId: number | null;
    isRead: boolean;
    createdAt: string;
    senderId?: number | null;
    senderName?: string | null;
    senderAvatarUrl?: string | null;
    deletedByUser?: boolean;
}
