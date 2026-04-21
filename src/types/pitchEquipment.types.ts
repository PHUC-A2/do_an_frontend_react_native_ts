export type EquipmentMobility = 'FIXED' | 'MOVABLE';

export interface ResPitchEquipmentDTO {
    id: number;
    pitchId: number;
    equipmentId: number;
    equipmentName: string;
    equipmentImageUrl?: string | null;
    quantity: number;
    specification?: string | null;
    note?: string | null;
    equipmentMobility: EquipmentMobility;
    equipmentAvailableQuantity?: number | null;
    equipmentStatus?: string | null;
    equipmentConditionNote?: string | null;
}
