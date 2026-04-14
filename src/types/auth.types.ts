export interface ReqLoginDTO {
    username: string;
    password: string;
}

export interface ReqRegisterDTO {
    email: string;
    password: string;
}

export interface ReqVerifyEmailDTO {
    userId: number;
    email: string;
    otp: string;
}

export interface ReqResendOtpDTO {
    userId: number;
    email: string;
}

export interface ReqForgotPasswordDTO {
    email: string;
}

export interface ReqResetPasswordDTO {
    email: string;
    otp: string;
    newPassword: string;
}

export interface JwtUserDTO {
    id: number;
    email: string;
    name: string;
    avatar: string | null;
}

export interface ResLoginDTO {
    user: JwtUserDTO;
    // Backend trả về snake_case do @JsonProperty("access_token")
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string;
}

export interface RegisterSuccessDTO {
    message: string;
    userId: number;
    email: string;
}
