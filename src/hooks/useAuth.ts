import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { loginAsync, logoutAsync, clearError } from '@redux/slices/authSlice';
import { ReqLoginDTO } from '@/types/auth.types';

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);
    const account = useAppSelector((s) => s.account.account);

    const login = useCallback(
        (credentials: ReqLoginDTO) => dispatch(loginAsync(credentials)),
        [dispatch],
    );

    const logout = useCallback(() => dispatch(logoutAsync()), [dispatch]);

    const dismissError = useCallback(() => dispatch(clearError()), [dispatch]);

    const currentUser = account
        ? {
            id: user?.id ?? account.id,
            email: account.email,
            name: account.name,
            avatar: account.avatar,
        }
        : user;
    const isAdmin = (account?.roles ?? []).some((role) => role.name === 'ADMIN');

    return { user: currentUser, account, isAuthenticated, isLoading, error, login, logout, dismissError, isAdmin };
}
