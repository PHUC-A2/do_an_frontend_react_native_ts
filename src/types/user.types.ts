export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';
export type NotificationSoundPreset = 'DEFAULT' | 'SOFT' | 'ALERT';

export interface ResUserListDTO {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    status: UserStatus;
    createdAt: string;
    roles: { id: number; name: string }[];
}

export interface ResUserDetailDTO extends ResUserListDTO {
    address: string | null;
    dob: string | null;
    bannedReason: string | null;
    bannedAt: string | null;
    updatedAt: string;
}

export interface ResAccountDTO {
    id: number;
    name: string;
    fullName: string | null;
    email: string;
    phone: string | null;
    phoneNumber: string | null;
    avatar: string | null;
    avatarUrl: string | null;
    address: string | null;
    dob: string | null;
    status: UserStatus;
    roles: { id: number; name: string }[];
    notificationSoundEnabled: boolean;
    notificationSoundPreset: NotificationSoundPreset;
    paymentPinConfigured?: boolean | null;
    paymentConfirmationPinRequiredBySystem?: boolean | null;
}

export interface ReqUpdateAccountDTO {
    name?: string;
    fullName?: string | null;
    phone?: string | null;
    phoneNumber?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    address?: string;
    dob?: string;
    notificationSoundEnabled?: boolean;
    notificationSoundPreset?: NotificationSoundPreset;
}
