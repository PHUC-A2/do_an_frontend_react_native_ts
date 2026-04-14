export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
export type EquipmentMobility = 'FIXED' | 'PORTABLE';

export interface ResEquipmentDTO {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    status: EquipmentStatus;
    mobility: EquipmentMobility;
    quantity: number;
    availableQuantity: number;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewTargetType = 'PITCH' | 'EQUIPMENT';

export interface ResReviewDTO {
    id: number;
    targetType: ReviewTargetType;
    targetId: number;
    targetName: string;
    userId: number;
    userName: string;
    userAvatar: string | null;
    rating: number;
    comment: string | null;
    status: ReviewStatus;
    createdAt: string;
}

export interface ReqCreateReviewDTO {
    targetType: ReviewTargetType;
    targetId: number;
    rating: number;
    comment?: string;
}
