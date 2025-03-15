// frontend/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    console.log('ProtectedRoute - Token:', token); // Debug log

    if (!token) {
        console.log('ProtectedRoute - Redirecting to /login'); // Debug log
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;