// frontend/src/pages/Login.tsx
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode
import { AuthContext } from '../context/AuthContext'; // Adjust the import path as necessary
import '../App.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
    const navigate = useNavigate();
    const { login, logout } = useContext(AuthContext);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // console.log('Submitting login:', { username, password });
        try {
            // Log out to clear any existing token
            logout();

            // Perform login using AuthContext
            await login(username, password);

            // Check subscription prompt for one-time payment users
            const token = localStorage.getItem('token');
            if (token) {
                const decoded: {
                    id: number;
                    username: string;
                    is_paid: boolean;
                    is_paid_onetime: boolean;
                } = jwtDecode(token);

                if (decoded.is_paid_onetime && !decoded.is_paid) {
                    let loginCount = parseInt(localStorage.getItem('login_count') || '0');
                    loginCount += 1;
                    localStorage.setItem('login_count', loginCount.toString());
                    if (loginCount % 5 === 0) {
                        setShowSubscriptionPrompt(true);
                        return; // Show prompt before redirecting
                    }
                }
            }

            // Redirect to Dashboard
            navigate('/app/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed. Check your credentials.');
        }
    };

    // useEffect(() => {
    //     console.log('Login component mounted');
    // }, []);

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
                {showSubscriptionPrompt && (
                    <div className="subscription-prompt">
                        <p>Upgrade to a subscription for more features!</p>
                        <Link to="/payment">Learn More</Link>
                        <button onClick={() => setShowSubscriptionPrompt(false)}>Not Now</button>
                    </div>
                )}
                <p>
                    Forgot your password? <Link to="/reset-password">Reset Password</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;