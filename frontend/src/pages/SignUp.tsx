// frontend/src/pages/Signup.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode';
import '../App.css';

const Signup: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // Add email state
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting signup:', { username, email, password });
        try {
            const response = await axiosInstance.post('/api/signup', { username, email, password });
            console.log('Signup success:', response.data);
            const { token } = response.data; // Correct variable name
            localStorage.setItem('token', token);
            const decoded: { id: number; username: string } = jwtDecode(token); // Should now work
            localStorage.setItem('user_id', decoded.id.toString());
            navigate('/app/dashboard');
        } catch (err) {
            console.error('Signup error:', err);
            setError('Signup failed. Username or email may already exist.');
        }
    };

    useEffect(() => {
        console.log('Signup component mounted');
    }, []);

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h2>Sign Up for Macrozapp</h2>
                <form onSubmit={handleSignup}>
                    <label htmlFor="signup-username">
                        Username
                        <input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                        />
                    </label>
                    <label htmlFor="signup-email">
                        Email
                        <input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </label>
                    <label htmlFor="signup-password">
                        Password
                        <div style={{ position: 'relative' }}>
                            <input
                                id="signup-password"
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
                            id="signup-show-password"
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />
                    </div>
                    <label htmlFor="signup-terms" style={{ display: 'block', margin: '10px 0' }}>
                        <input
                            id="signup-terms"
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            required
                        />{' '}
                        I agree to the <Link to="/terms">Terms of Service</Link>, including the potential use of my email for marketing in the free version (not applicable for paid plans).
                    </label>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <button type="submit">Sign Up</button>
                </form>
                <p>
                    Already have an account? <Link to="/login">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;