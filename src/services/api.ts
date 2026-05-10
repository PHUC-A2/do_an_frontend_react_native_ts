import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, ENDPOINTS } from '@config/api.config';
import { storage } from '@utils/storage';
import { emitUnauthorized } from './sessionEvents';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ------ Request Interceptor ------
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await storage.getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

// ------ Response Interceptor ------
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const onRefreshed = (token: string | null) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string | null) => void) => {
    refreshSubscribers.push(cb);
};

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Wait for refresh to complete, then retry
                return new Promise((resolve, reject) => {
                    addRefreshSubscriber((token) => {
                        if (token && originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        } else {
                            reject(error);
                        }
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh token
                const refreshRes = await api.post(ENDPOINTS.AUTH.REFRESH);
                const newToken = refreshRes.data.data?.access_token;

                if (newToken) {
                    await storage.setAccessToken(newToken);
                    onRefreshed(newToken);
                    isRefreshing = false;

                    // Retry original request with new token
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    }
                    return api(originalRequest);
                } else {
                    throw new Error('No token in refresh response');
                }
            } catch (refreshError) {
                // Refresh failed → clear credentials and trigger logout
                await storage.clearAll();
                onRefreshed(null);
                isRefreshing = false;
                emitUnauthorized();
                return Promise.reject(error);
            }
        }

        if (error.response?.status === 401) {
            // Already retried once and still failed
            await storage.clearAll();
            emitUnauthorized();
        }

        return Promise.reject(error);
    },
);

export default api;
