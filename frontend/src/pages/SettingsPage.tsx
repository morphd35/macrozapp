import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const SettingsPage: React.FC = () => {
    const { user, token, refreshUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCancelSubscription = async () => {
        if (!user || !token) {
            setError('You must be logged in to cancel your subscription.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/premium_1/cancel-subscription`,
                { userId: user.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            await refreshUser(); // Refresh user data to update subscription_status
            setTimeout(() => navigate('/app/dashboard'), 3000);
        } catch (err) {
            console.error('Cancellation error:', err);
            setError('Failed to cancel subscription. Please try again or contact support.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500 flex justify-center items-center">
            <div className="card w-full max-w-md p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Settings</h1>

                {user?.isPaid ? (
                    <>
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Subscription</h2>
                        <p className="text-gray-600 mb-4">
                            You are currently subscribed to MacroZapp Premium.
                            {user.subscription_status === 'cancel_pending' && (
                                <span> Your subscription will end at the current billing period.</span>
                            )}
                        </p>
                        {user.subscription_status !== 'cancel_pending' && (
                            <button
                                onClick={handleCancelSubscription}
                                disabled={loading}
                                className={`w-full py-2 px-4 rounded ${loading ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
                                    } text-white font-semibold`}
                            >
                                {loading ? 'Canceling...' : 'Cancel Subscription'}
                            </button>
                        )}
                        {message && <p className="text-green-600 mt-4">{message}</p>}
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </>
                ) : (
                    <p className="text-gray-600 mb-4">
                        You are not currently subscribed.{' '}
                        <a href="/payment" className="text-blue-500 underline">
                            Upgrade to Premium
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;