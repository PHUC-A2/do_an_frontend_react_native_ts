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
    borrowerSignName?: string | null;
    staffSignName?: string | null;
    returnerNameSnapshot?: string | null;
    returnerPhoneSnapshot?: string | null;
    returnReportPrintOptIn?: boolean | null;
    receiverNameSnapshot?: string | null;
    receiverPhoneSnapshot?: string | null;
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
    borrowerSignName?: string | null;
    staffSignName?: string | null;
    returnerName?: string | null;
    returnerPhone?: string | null;
    receiverName?: string | null;
    receiverPhone?: string | null;
    returnReportPrintOptIn?: boolean | null;
}
