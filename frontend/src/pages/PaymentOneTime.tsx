import { useState, useEffect, useContext } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import AdbIcon from '@mui/icons-material/Adb';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import { AuthContext } from '../context/AuthContext';

// console.log('Stripe Publishable Key:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
// console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);

if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('REACT_APP_STRIPE_PUBLISHABLE_KEY is not defined in the environment variables.');
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const PaymentOneTime: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshUser } = useContext(AuthContext);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);

    const query = new URLSearchParams(location.search);
    const sessionId = query.get('session_id');

    const handleCheckout = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found. Please log in.');
            // console.log('Fetching checkout session from /api/auth/create-checkout-session');
            const response = await axios.post(
                `${API_BASE_URL}/api/auth/create-checkout-session`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // console.log('Checkout session response:', response.data);

            if (!response.data.sessionId) {
                throw new Error('No session ID returned from the server.');
            }

            const stripe = await stripePromise;
            if (!stripe) {
                throw new Error('Stripe.js not loaded');
            }

            // console.log('Redirecting to Stripe Checkout with sessionId:', response.data.sessionId);
            const { error: stripeError } = await stripe.redirectToCheckout({
                sessionId: response.data.sessionId,
            });

            if (stripeError) {
                throw new Error(stripeError.message);
            }
        } catch (err) {
            const error = err as AxiosError<{ message?: string; details?: string }>;
            const errorMessage = error.response?.data?.message || error.response?.data?.details || error.message || 'Failed to initiate checkout.';
            console.error('Error initiating checkout:', error.response?.data || error);
            setError(errorMessage);
        }
    };

    useEffect(() => {
        // console.log('Current location:', location.pathname, location.search);
        const verifyPayment = async () => {
            if (location.pathname === '/payment-success-onetime') {
                setIsVerifying(true);
                try {
                    if (sessionId) {
                        // console.log('Redirected to /payment-success-onetime with session_id:', sessionId);
                        const token = localStorage.getItem('token');
                        // console.log('Verifying payment with session_id:', sessionId);
                        const response = await axios.get(
                            `${API_BASE_URL}/api/auth/verify-payment?session_id=${sessionId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        // console.log('Verify payment response:', response.data);
                        if (response.data.success) {
                            setPaymentStatus('success');
                            await refreshUser();
                            navigate('/thank-you', { state: { paymentVerified: true } });
                        } else {
                            setPaymentStatus('failed');
                            setError('Payment verification failed.');
                            setTimeout(() => navigate('/payment-cancel'), 3000);
                        }
                    } else {
                        // console.log('No session_id found in query parameters, assuming payment success');
                        // If session_id is missing, assume payment was successful and proceed
                        setPaymentStatus('success');
                        await refreshUser();
                        navigate('/thank-you', { state: { paymentVerified: true } });
                    }
                } catch (err) {
                    const error = err as AxiosError<{ message?: string }>;
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to verify payment.';
                    console.error('Error verifying payment:', error.response?.data || error);
                    setPaymentStatus('failed');
                    setError(errorMessage);
                    setTimeout(() => navigate('/payment-cancel'), 3000);
                } finally {
                    setIsVerifying(false);
                }
            } else {
                // console.log('Not on /payment-success-onetime, skipping verification');
            }
        };

        verifyPayment();
    }, [location, navigate, sessionId, refreshUser]);

    return (
        <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500">
            <div className="flex justify-center items-center h-[calc(100vh-80px)] px-4">
                <div className="card">
                    {isVerifying ? (
                        <><h1 className="text-2xl font-bold text-gray-800 mb-4">Verifying Payment</h1><p className="text-gray-600 mb-6">Please wait...</p></>
                    ) : paymentStatus === 'success' ? (
                        <><h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1><p className="text-gray-600 mb-6">Redirecting...</p></>
                    ) : paymentStatus === 'failed' ? (
                        <><h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1><p className="text-gray-600 mb-6">{error}</p></>
                    ) : (
                        <>
                            <h1 className="payment-headline text-3xl font-bold mb-4 text-center">Upgrade to MacroZapp One-Time Premium</h1>
                            <p className="text-gray-600 mb-6 text-center">
                                For a one-time payment of <span className="font-bold text-green-600">$8.99</span>, enjoy an ad-free experience, guaranteed data privacy, and easy local food search—no subscription required!
                            </p>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">What You Get</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start"><AdbIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} /><div><h3 className="text-lg font-medium text-gray-800">Ad-Free</h3><p className="text-gray-600">No ads, just focus.</p></div></div>
                                    <div className="flex items-start"><LockIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} /><div><h3 className="text-lg font-medium text-gray-800">Data Privacy</h3><p className="text-gray-600">Your data stays yours.</p></div></div>
                                    <div className="flex items-start"><SearchIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} /><div><h3 className="text-lg font-medium text-gray-800">Local Search</h3><p className="text-gray-600">Find your foods fast.</p></div></div>
                                </div>
                            </div>
                            <div className="text-center mb-6"><p className="text-2xl font-bold text-gray-800 mb-2">Just $8.99 One-Time</p><p className="text-gray-600 mb-4">Lifetime access.</p></div>
                            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                            <div className="text-center">
                                <button
                                    onClick={handleCheckout}
                                    className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600"
                                >
                                    Pay Now
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentOneTime;