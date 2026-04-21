import api from './api';
import { ENDPOINTS } from '@config/api.config';
import {
    ReqLoginDTO,
    ReqRegisterDTO,
    ReqVerifyEmailDTO,
    ReqResendOtpDTO,
    ReqForgotPasswordDTO,
    ReqResetPasswordDTO,
    ResLoginDTO,
    RegisterSuccessDTO,
} from '@/types/auth.types';
import { ResAccountDTO, ReqUpdateAccountDTO } from '@/types/user.types';
import { RestResponse } from '@/types/common.types';

export const authService = {
    login: (data: ReqLoginDTO) =>
        api.post<RestResponse<ResLoginDTO>>(ENDPOINTS.AUTH.LOGIN, data),

    register: (data: ReqRegisterDTO) =>
        api.post<RestResponse<{ message: RegisterSuccessDTO }>>(ENDPOINTS.AUTH.REGISTER, data),

    verifyEmail: (data: ReqVerifyEmailDTO) =>
        api.post<RestResponse<{ message: string }>>(ENDPOINTS.AUTH.VERIFY_EMAIL, data),

    resendOtp: (data: ReqResendOtpDTO) =>
        api.post<RestResponse<{ message: string }>>(ENDPOINTS.AUTH.RESEND_OTP, data),

    resendOtpByEmail: (email: string) =>
        api.post<RestResponse<{ message: RegisterSuccessDTO }>>(ENDPOINTS.AUTH.RESEND_OTP_BY_EMAIL, { email }),

    forgotPassword: (data: ReqForgotPasswordDTO) =>
        api.post<RestResponse<{ message: string }>>(ENDPOINTS.AUTH.FORGOT_PASSWORD, data),

    resetPassword: (data: ReqResetPasswordDTO) =>
        api.post<RestResponse<{ message: string }>>(ENDPOINTS.AUTH.RESET_PASSWORD, data),

    getAccount: () =>
        api.get<RestResponse<ResAccountDTO>>(ENDPOINTS.AUTH.ACCOUNT),

    updateAccount: (data: ReqUpdateAccountDTO) =>
        api.patch<RestResponse<ResAccountDTO>>(ENDPOINTS.AUTH.ACCOUNT_ME, data),

    uploadAvatarImage: (formData: FormData) =>
        api.post<RestResponse<{ url: string }>>(ENDPOINTS.FILES.UPLOAD, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    logout: () =>
        api.post<RestResponse<null>>(ENDPOINTS.AUTH.LOGOUT),
};
