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
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isHydrated: false,
};

// ---- Async Thunks ----

export const hydrateAuth = createAsyncThunk('auth/hydrate', async () => {
    const [token, user] = await Promise.all([
        storage.getAccessToken(),
        storage.getUser<JwtUserDTO>(),
    ]);
    if (token && user) return { user, token };
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
    },
    extraReducers: (builder) => {
        // Hydrate
        builder.addCase(hydrateAuth.fulfilled, (state, action) => {
            if (action.payload) {
                state.user = action.payload.user;
                state.isAuthenticated = true;
            }
            state.isHydrated = true;
        });
        builder.addCase(hydrateAuth.rejected, (state) => {
            state.isHydrated = true;
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
        });

    },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
