export type BookingEquipmentStatus = 'BORROWED' | 'RETURNED' | 'LOST' | 'DAMAGED';

export interface ResBookingEquipmentDTO {
    id: number;
    bookingId: number;
    equipmentId: number;
    equipmentName: string;
    equipmentImageUrl: string | null;
    quantity: number;
    quantityReturnedGood: number | null;
    quantityLost: number | null;
    quantityDamaged: number | null;
    status: BookingEquipmentStatus;
    penaltyAmount: number;
    borrowConditionNote: string | null;
    returnConditionNote: string | null;
    deletedByClient: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ReqUpdateBookingEquipmentStatusDTO {
    status: BookingEquipmentStatus;
    quantityReturnedGood?: number;
    quantityLost?: number;
    quantityDamaged?: number;
    returnConditionNote?: string;
}
