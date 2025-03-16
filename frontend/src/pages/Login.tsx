// frontend/src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode
import '../App.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting login:', { username, password });
        try {
            const response = await axiosInstance.post('/login', { username, password });
            console.log('Login success:', response.data);
            const { token } = response.data;
            localStorage.setItem('token', token);
            // Decode the token to get user_id
            const decoded: { id: number; username: string } = jwtDecode(token); // Should now work with named import
            localStorage.setItem('user_id', decoded.id.toString());
            navigate('/app/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed. Check your credentials.');
        }
    };

    useEffect(() => {
        console.log('Login component mounted');
    }, []);

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h2>Login to Macrozapp</h2>
                <form onSubmit={handleLogin}>
                    <label htmlFor="login-username">
                        Username
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                        />
                    </label>
                    <label htmlFor="login-password">
                        Password
                        <div style={{ position: 'relative' }}>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
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
                            id="login-show-password"
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />
                    </div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <button type="submit">Login</button>
                </form>
                <p>
                    Forgot your password? <Link to="/reset-password">Reset Password</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;