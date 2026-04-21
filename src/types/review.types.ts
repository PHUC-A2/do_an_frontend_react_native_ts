/** Khớp backend / web `frontend/src/types/review.ts` */
export type ReviewTargetType = 'SYSTEM' | 'PITCH';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

export interface ResReviewDTO {
    id: number;
    targetType: ReviewTargetType;
    pitchId?: number | null;
    pitchName?: string | null;
    rating: number;
    content: string;
    status: ReviewStatus;
    userId: number;
    userName?: string | null;
    userFullName?: string | null;
    createdAt: string;
    updatedAt?: string | null;
}

export interface ResReviewMessageDTO {
    id: number;
    reviewId: number;
    senderId: number;
    senderName?: string | null;
    senderFullName?: string | null;
    senderAvatarUrl?: string | null;
    content: string;
    deliveredAt?: string | null;
    readAt?: string | null;
    createdAt: string;
}

export interface ReqCreateReviewDTO {
    targetType: ReviewTargetType;
    pitchId?: number;
    rating: number;
    content: string;
}

export interface ReqReviewMessageDTO {
    content: string;
}
