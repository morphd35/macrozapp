import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000', // Fallback for local if env var is missing
    timeout: 10000,
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = localStorage.getItem('token');
        // console.log('Request URL:', config.url);
        // console.log('Token in axios interceptor:', token);
        if (token) {

            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${token}`;
            // console.log('Authorization header set:', config.headers['Authorization']);

        } else {
            // console.log('No token found in localStorage for request:', config.url); // Debug log
        }
        return config;
    },
    (error: AxiosError) => {
        console.error('Request interceptor error:', error.message);
        return Promise.reject(error);
    }
);

// Response interceptor (single instance)
axiosInstance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    (error: AxiosError) => {
        // console.log('Response error status:', error.response?.status);
        if (error.response?.status === 401) {
            console.log('401 Unauthorized - Removing token and user_id from localStorage');
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            // Optionally redirect to login page (uncomment if needed)
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;