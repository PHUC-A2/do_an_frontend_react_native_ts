export type BookingStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'CONFIRMED'
    | 'PAID'
    | 'CHECKIN'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';

export interface ReqCreateBookingDTO {
    pitchId: number;
    startDateTime: string;  // ISO datetime "2026-04-11T07:00:00"
    endDateTime: string;
    contactPhone?: string;
}

export interface ReqUpdateBookingDTO {
    pitchId: number;
    startDateTime: string; // ISO datetime "2026-04-11T07:00:00"
    endDateTime: string;
    contactPhone?: string;
}

export interface ResBookingDTO {
    id: number;
    pitchId: number;
    pitchName: string;
    pitchImage?: string | null;
    userId: number;
    userName: string;
    /** ISO datetime — trường từ /client/bookings */
    startDateTime: string;
    endDateTime: string;
    totalPrice: number;
    status: BookingStatus;
    note?: string | null;
    contactPhone?: string | null;
    durationMinutes?: number;
    deletedByUser?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ResCreateBookingDTO {
    id: number;
    pitchId: number;
    pitchName: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: BookingStatus;
    createdAt: string;
}

export type SlotStatus = 'PAST' | 'FREE' | 'PENDING' | 'BOOKED' | 'BOOKED_BY_OTHER';

export interface ResPitchTimelineSlotDTO {
    start: string;  // ISO datetime e.g. "2026-04-11T06:00:00"
    end: string;
    status: SlotStatus;
}

export interface ResPitchTimelineDTO {
    openTime: string;   // e.g. "06:00:00"
    closeTime: string;
    slotMinutes: number;
    slots: ResPitchTimelineSlotDTO[];
}
