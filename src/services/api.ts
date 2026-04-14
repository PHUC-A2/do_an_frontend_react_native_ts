import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@config/api.config';
import { storage } from '@utils/storage';

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
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired → clear credentials and trigger logout
            await storage.clearAll();
            // The navigation to login is handled by the AuthNavigator watching redux state
        }
        return Promise.reject(error);
    },
);

export default api;
