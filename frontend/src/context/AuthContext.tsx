import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

interface User {
    id: string;
    email: string;
    isPaid: boolean;
    is_admin: boolean;
    isPaidOneTime: boolean;
    subscription_status?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: async () => { },
    logout: () => { },
    refreshUser: async () => { },
});

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isInitialized, setIsInitialized] = useState(false);

    const fetchUserData = useCallback(async (currentToken: string) => {
        if (!currentToken) {
            console.log('Skipping fetchUserData: No token');
            return;
        }

        try {
            console.log('Fetching user data with token:', currentToken);
            console.log('Request URL:', `${API_BASE_URL}/api/premium_1/me`);
            const response = await axios.get(`${API_BASE_URL}/api/premium_1/me`, {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            console.log('Raw response from /api/premium_1/me:', response.data);
            const userData = {
                id: response.data.id,
                email: response.data.email,
                isPaid: response.data.isPaid === true || response.data.is_paid === true || response.data.isPaid === 'true' || response.data.is_paid === 'true',
                is_admin: response.data.is_admin === true || response.data.is_admin === 'true',
                isPaidOneTime: response.data.isPaidOneTime === true || response.data.isPaidOneTime === 'true',
                subscription_status: response.data.subscription_status,
            };
            console.log('User data from /api/auth/me:', userData);
            setUser(userData);
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            console.error('Error fetching user data:', {
                status: axiosError.response?.status,
                data: axiosError.response?.data,
                message: axiosError.message,
            });
            if (axiosError.response?.status === 401) {
                console.log('Invalid token, logging out');
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } else {
                console.log('Non-auth error, keeping user logged in');
            }
        }
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        console.log('Token in localStorage on mount:', storedToken);
        if (storedToken) {
            setToken(storedToken);
        } else {
            console.log('No token found in localStorage on mount');
            setUser(null);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized && token) {
            fetchUserData(token);
        }
    }, [token, isInitialized, fetchUserData]);

    const login = async (username: string, password: string) => {
        try {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
            const { token } = response.data;
            console.log('Login response:', response.data);
            localStorage.setItem('token', token);
            setToken(token);
            await fetchUserData(token);
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            console.error('Login error:', axiosError.response?.status, axiosError.response?.data || axiosError.message);
            throw error;
        }
    };

    const logout = () => {
        console.log('User logged out, user set to null');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        if (token) {
            await fetchUserData(token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};