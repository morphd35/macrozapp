// frontend/src/pages/ResetPasswordConfirm.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import '../App.css';

const ResetPasswordConfirm: React.FC = () => {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError('Invalid or missing reset token.');
        }
    }, [searchParams]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError('No reset token provided.');
            return;
        }
        try {
            const response = await axios.post('http://localhost:4000/api/reset-password-confirm', {
                token,
                newPassword,
            });
            console.log('Reset password response:', response.data); // Use the response
            setMessage('Password reset successfully. You can now log in with your new password.');
            setError('');
        } catch (err) {
            console.error('Reset password confirm error:', err);
            setError('Failed to reset password. The link may have expired or is invalid.');
            setMessage('');
        }
    };

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h2>Set New Password</h2>
                {token ? (
                    <form onSubmit={handleResetPassword}>
                        <label htmlFor="reset-confirm-password">
                            New Password
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reset-confirm-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    required
                                    style={{ paddingRight: '30px', width: '100%' }}
                                />
                                <FontAwesomeIcon
                                    icon={showPassword ? faEyeSlash : faEye}
                                    className="password-icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                />
                            </div>
                        </label>
                        <div className="checkbox-container">
                            <span>Show Password</span>
                            <input
                                id="reset-confirm-show-password"
                                type="checkbox"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                            />
                        </div>
                        {message && <p style={{ color: 'green' }}>{message}</p>}
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        <button type="submit">Reset Password</button>
                    </form>
                ) : (
                    <p style={{ color: 'red' }}>{error}</p>
                )}
                <p>
                    Back to <Link to="/login">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordConfirm;