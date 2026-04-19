import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@services/auth.service';
import type { ResAccountDTO } from '@/types/user.types';
import { hardLogoutAsync, logoutAsync } from './authSlice';

interface AccountState {
    account: ResAccountDTO | null;
    loading: boolean;
    error: string | null;
}

const initialState: AccountState = {
    account: null,
    loading: true,
    error: null,
};

export const fetchAccount = createAsyncThunk<
    ResAccountDTO,
    void,
    { rejectValue: string }
>(
    'account/fetchAccount',
    async (_, { rejectWithValue }) => {
        try {
            const res = await authService.getAccount();
            // Backend đang trả data.user, còn mobile dùng shape ResAccountDTO.
            const rawData: any = res.data?.data;
            const rawUser = rawData?.user ?? rawData;
            if (rawUser) {
                const normalizedAccount: ResAccountDTO = {
                    id: rawUser.id,
                    name: rawUser.name ?? rawUser.fullName ?? '',
                    email: rawUser.email ?? '',
                    phone: rawUser.phone ?? rawUser.phoneNumber ?? null,
                    avatar: rawUser.avatar ?? rawUser.avatarUrl ?? null,
                    address: rawUser.address ?? null,
                    dob: rawUser.dob ?? null,
                    status: rawUser.status ?? 'ACTIVE',
                    roles: Array.isArray(rawUser.roles) ? rawUser.roles : [],
                };
                return normalizedAccount;
            }
            return rejectWithValue('Không lấy được thông tin tài khoản');
        } catch (error: any) {
            return rejectWithValue(error?.response?.data?.message ?? 'Lỗi hệ thống');
        }
    },
);

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        setAccount(state, action: PayloadAction<ResAccountDTO>) {
            state.account = action.payload;
            state.loading = false;
            state.error = null;
        },
        clearAccount(state) {
            state.account = null;
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAccount.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAccount.fulfilled, (state, action) => {
                state.loading = false;
                state.account = action.payload;
                state.error = null;
            })
            .addCase(fetchAccount.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? 'Không lấy được thông tin tài khoản';
            })
            .addCase(logoutAsync.fulfilled, (state) => {
                state.account = null;
                state.loading = false;
                state.error = null;
            })
            .addCase(hardLogoutAsync.fulfilled, (state) => {
                state.account = null;
                state.loading = false;
                state.error = null;
            });
    },
});

export const { setAccount, clearAccount } = accountSlice.actions;
export default accountSlice.reducer;
