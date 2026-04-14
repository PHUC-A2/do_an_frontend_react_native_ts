export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';

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
    email: string;
    phone: string | null;
    avatar: string | null;
    address: string | null;
    dob: string | null;
    status: UserStatus;
    roles: { id: number; name: string }[];
}

export interface ReqUpdateAccountDTO {
    name?: string;
    phone?: string;
    address?: string;
    dob?: string;
}
