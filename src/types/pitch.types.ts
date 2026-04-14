export type PitchStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type PitchType = 'THREE' | 'FIVE' | 'SEVEN' | 'ELEVEN';

export interface ResPitchHourlyPriceDTO {
    startTime: string;
    endTime: string;
    pricePerHour: number;
}

export interface ResPitchDTO {
    id: number;
    name: string;
    description: string | null;
    address: string;
    pitchUrl: string | null;    // frontend field name (may come as imageUrl from backend)
    imageUrl?: string | null;   // backend DTO field name alias
    status: PitchStatus;
    pitchType: PitchType;
    openTime: string | null;
    closeTime: string | null;
    open24h: boolean;
    pricePerHour: number;
    hourlyPrices: ResPitchHourlyPriceDTO[];
    averageRating: number | null;
    reviewCount: number;
    length?: number | null;
    width?: number | null;
    height?: number | null;
}

export interface ReqCreatePitchDTO {
    name: string;
    description?: string;
    address: string;
    type: PitchType;
    openTime: string;
    closeTime: string;
    images?: string[];
}

export interface ReqUpdatePitchDTO extends Partial<ReqCreatePitchDTO> {
    status?: PitchStatus;
}
