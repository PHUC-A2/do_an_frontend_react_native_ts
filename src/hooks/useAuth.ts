import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { loginAsync, logoutAsync, clearError } from '@redux/slices/authSlice';
import { ReqLoginDTO } from '@/types/auth.types';

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);

    const login = useCallback(
        (credentials: ReqLoginDTO) => dispatch(loginAsync(credentials)),
        [dispatch],
    );

    const logout = useCallback(() => dispatch(logoutAsync()), [dispatch]);

    const dismissError = useCallback(() => dispatch(clearError()), [dispatch]);

    const isAdmin = user ? false : false; // Extend: check roles from fetchAccount

    return { user, isAuthenticated, isLoading, error, login, logout, dismissError, isAdmin };
}
