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
    subscription_status?: string;
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
    const [isInitialized, setIsInitialized] = useState(false);

    // Function to fetch user data from /api/auth/me
    const fetchUserData = async (currentToken: string) => {
        if (!currentToken) return;
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
            console.error('Error fetching user data:', axiosError.response?.status, axiosError.response?.data || axiosError.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    // Initialize token from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        console.log('Token in localStorage on mount:', storedToken);
        if (storedToken) {
            setToken(storedToken);
            fetchUserData(storedToken);
        } else {
            console.log('No token found in localStorage on mount');
            setUser(null);
        }
        setIsInitialized(true);
    }, []);

    // Fetch user data on mount or when token changes
    useEffect(() => {
        if (isInitialized && token) {
            fetchUserData(token);
        }
    }, [token, isInitialized]);

    const login = async (username: string, password: string) => {
        try {
            // Clear existing token and user data
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            // Perform login
            const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
            const { token } = response.data;
            console.log('Login response:', response.data);
            // Update localStorage and state
            localStorage.setItem('token', token);
            setToken(token);
            // Immediately fetch user data with the new token
            await fetchUserData(token);
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
            await fetchUserData(token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};