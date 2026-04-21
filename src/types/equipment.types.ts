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
