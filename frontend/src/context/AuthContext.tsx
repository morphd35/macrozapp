import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AxiosError } from 'axios';

// Use the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

interface User {
    id: string;
    email: string;
    isPaid: boolean;
    is_admin: boolean;
    isPaidOneTime: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>; // Add refreshUser to context
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: async () => { },
    logout: () => { },
    refreshUser: async () => { }, // Add default refreshUser
});

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    // Function to fetch user data from /api/auth/me
    const fetchUserData = async () => {
        if (!token) return;
        try {
            console.log('Fetching user data with token:', token);
            console.log('Request URL:', `${API_BASE_URL}/api/auth/me`);
            const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Raw response from /api/auth/me:', response.data);
            const userData = {
                id: response.data.id,
                email: response.data.email,
                isPaid: response.data.isPaid === true || response.data.is_paid === true || response.data.isPaid === 'true' || response.data.is_paid === 'true',
                is_admin: response.data.is_admin === true || response.data.is_admin === 'true',
                isPaidOneTime: response.data.isPaidOneTime === true || response.data.isPaidOneTime === 'true',
            };
            console.log('User data from /api/auth/me:', userData);
            setUser(userData);
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            console.error('Error fetching user data:', axiosError.response?.status, axiosError.response?.data || axiosError.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    // Fetch user data on mount or when token changes
    useEffect(() => {
        console.log('Token in localStorage on mount or update:', token);
        if (token) {
            fetchUserData();
        } else {
            console.log('No token found in localStorage on mount or update');
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });
            const { token } = response.data;
            console.log('Login response:', response.data);
            localStorage.setItem('token', token);
            setToken(token);
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            console.error('Login error:', axiosError.response?.status, axiosError.response?.data || axiosError.message);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        console.log('User logged out, user set to null');
    };

    // Expose a function to refresh user data
    const refreshUser = async () => {
        if (token) {
            await fetchUserData();
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};