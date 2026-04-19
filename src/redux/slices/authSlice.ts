import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@services/auth.service';
import { storage } from '@utils/storage';
import { JwtUserDTO, ReqLoginDTO, ReqRegisterDTO } from '@/types/auth.types';
import { AxiosError } from 'axios';

interface AuthState {
    user: JwtUserDTO | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;
    /** Có JWT trong SecureStore nhưng cần Face ID / vân tay trước khi vào app */
    pendingBiometricUnlock: boolean;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isHydrated: false,
    pendingBiometricUnlock: false,
};

// ---- Async Thunks ----

export const hydrateAuth = createAsyncThunk('auth/hydrate', async () => {
    const [token, user, biometricEnabled] = await Promise.all([
        storage.getAccessToken(),
        storage.getUser<JwtUserDTO>(),
        storage.getBiometricLoginEnabled(),
    ]);
    if (token && user) {
        return { user, requireBiometricUnlock: biometricEnabled };
    }
    return null;
});

export const loginAsync = createAsyncThunk(
    'auth/login',
    async (credentials: ReqLoginDTO, { rejectWithValue }) => {
        try {
            const res = await authService.login(credentials);
            const data = res.data.data!;
            const accessToken = data.access_token;
            const { user } = data;
            await storage.setAccessToken(accessToken);
            await storage.setUser(user);
            return user;
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            return rejectWithValue(error.response?.data?.message ?? 'Đăng nhập thất bại');
        }
    },
);

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
    // Đăng xuất kiểu "khóa app": giữ token + cờ sinh trắc học để lần sau mở khóa nhanh.
    return true;
});

export const hardLogoutAsync = createAsyncThunk('auth/hardLogout', async () => {
    try {
        await authService.logout();
    } finally {
        await storage.clearAll();
    }
});

// ---- Slice ----

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setUser(state, action: PayloadAction<JwtUserDTO>) {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        /** Sau khi xác thực sinh trắc học thành công ở màn khóa mở app */
        completeBiometricSession(state, action: PayloadAction<JwtUserDTO>) {
            state.pendingBiometricUnlock = false;
            state.user = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        // Hydrate
        builder.addCase(hydrateAuth.fulfilled, (state, action) => {
            state.isHydrated = true;
            if (action.payload) {
                if (action.payload.requireBiometricUnlock) {
                    state.pendingBiometricUnlock = true;
                    state.user = null;
                    state.isAuthenticated = false;
                } else {
                    state.pendingBiometricUnlock = false;
                    state.user = action.payload.user;
                    state.isAuthenticated = true;
                }
            } else {
                state.pendingBiometricUnlock = false;
            }
        });
        builder.addCase(hydrateAuth.rejected, (state) => {
            state.isHydrated = true;
            state.pendingBiometricUnlock = false;
        });

        // Login
        builder.addCase(loginAsync.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(loginAsync.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload;
            state.isAuthenticated = true;
        });
        builder.addCase(loginAsync.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Logout
        builder.addCase(logoutAsync.fulfilled, (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.pendingBiometricUnlock = false;
        });
        builder.addCase(hardLogoutAsync.fulfilled, (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.pendingBiometricUnlock = false;
        });

    },
});

export const { clearError, setUser, completeBiometricSession } = authSlice.actions;
export default authSlice.reducer;
