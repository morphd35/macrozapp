// frontend/src/pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';
import { Link } from 'react-router-dom';
import '../App.css';

const ResetPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting reset password request for:', email);
        try {
            const response = await axiosInstance.post('/reset-password', { email });
            console.log('Reset password request success:', response.data);
            setMessage('A reset link has been sent to your email.');
            setError('');
        } catch (err) {
            console.error('Reset password error:', err);
            setError('Failed to request password reset. User not found.');
            setMessage('');
        }
    };

    useEffect(() => {
        console.log('ResetPassword component mounted');
    }, []);

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h2>Reset Your Password</h2>
                <form onSubmit={handleResetPassword}>
                    <label htmlFor="reset-email">
                        Email
                        <input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </label>
                    {message && <p style={{ color: 'green' }}>{message}</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <button type="submit">Request Reset Link</button>
                </form>
                <p>
                    Back to <Link to="/login">Log In</Link> or <Link to="/signup">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;