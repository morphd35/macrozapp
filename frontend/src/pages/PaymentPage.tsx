import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import SearchIcon from '@mui/icons-material/Search'; // Icon for food lookup
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Icon for advanced goals
import StorageIcon from '@mui/icons-material/Storage'; // Icon for data storage
import LockOpenIcon from '@mui/icons-material/LockOpen'; // Icon for unlocking features

// Debug the environment variable
// console.log('Stripe Publishable Key:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
// console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);

// Ensure the key exists before initializing Stripe
if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('REACT_APP_STRIPE_PUBLISHABLE_KEY is not defined in the environment variables.');
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Use the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const PaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);

    // Check if there's a session_id in the URL on mount
    const query = new URLSearchParams(location.search);
    const sessionId = query.get('session_id');

    // Fetch the client secret when the component mounts (only if no session_id)
    useEffect(() => {
        if (!sessionId) {
            const fetchClientSecret = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.post(
                        `${API_BASE_URL}/api/premium_1/create-checkout-session`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    setClientSecret(response.data.clientSecret);
                } catch (err) {
                    console.error('Error fetching client secret:', err);
                    setError('Failed to load payment form. Please try again.');
                }
            };

            fetchClientSecret();
        }
    }, [location]);

    // Handle payment completion (called when the user returns to the page with a session_id)
    useEffect(() => {
        const verifyPayment = async () => {
            if (sessionId) {
                setIsVerifying(true);
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(
                        `${API_BASE_URL}/api/premium_1/verify-payment?session_id=${sessionId}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    if (response.data.success) {
                        setPaymentStatus('success');
                        // Redirect to Thank You Page instead of showing an alert
                        navigate('/thank-you', { state: { paymentVerified: true } });
                    } else {
                        setPaymentStatus('failed');
                        setError('Payment verification failed. Please contact support.');
                        setTimeout(() => {
                            navigate('/payment-cancel');
                        }, 3000); // Redirect after 3 seconds
                    }
                } catch (err) {
                    console.error('Error verifying payment:', err);
                    setPaymentStatus('failed');
                    setError('Failed to verify payment. Please contact support.');
                    setTimeout(() => {
                        navigate('/payment-cancel');
                    }, 3000); // Redirect after 3 seconds
                } finally {
                    setIsVerifying(false);
                }
            }
        };

        verifyPayment();
    }, [location, navigate, sessionId]);

    return (
        <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500">
            {/* Main Content */}
            <div className="flex justify-center items-center h-[calc(100vh-80px)] px-4">
                <div className="card">
                    {isVerifying ? (
                        <>
                            <h1 className="text-2xl font-bold text-gray-800 mb-4">Verifying Payment</h1>
                            <p className="text-gray-600 mb-6">
                                Please wait while we verify your payment...
                            </p>
                        </>
                    ) : paymentStatus === 'success' ? (
                        <>
                            <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
                            <p className="text-gray-600 mb-6">
                                Redirecting to Thank You page...
                            </p>
                        </>
                    ) : paymentStatus === 'failed' ? (
                        <>
                            <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1>
                            <p className="text-gray-600 mb-6">
                                {error || 'There was an issue verifying your payment. Redirecting...'}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="payment-headline text-3xl font-bold mb-4 text-center">Unlock the Full Power of MacroZapp with Premium</h1>
                            <p className="text-gray-600 mb-6 text-center">
                                Take your fitness journey to the next level with MacroZapp Premium. For just <span className="font-bold text-green-600">$4.99/month</span>, you’ll gain access to powerful features designed to help you achieve your goals faster and more effectively.
                            </p>

                            {/* Benefits Section */}
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">Why Upgrade to MacroZapp Premium?</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start">
                                        <SearchIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} />
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800">Food Lookup</h3>
                                            <p className="text-gray-600">
                                                Instantly search and log foods from a vast database powered by Edamam. Track your macros with precision by finding nutritional data for thousands of foods, from avocados to zucchini.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <TrendingUpIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} />
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800">Advanced Goals</h3>
                                            <p className="text-gray-600">
                                                Set personalized macro goals tailored to your fitness objectives—whether you’re aiming to lose weight, build muscle, or maintain a balanced diet. Get detailed insights to stay on track.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <StorageIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} />
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800">12 Months of Data Storage</h3>
                                            <p className="text-gray-600">
                                                Keep a full year of your food logs, weight entries, and progress data. Analyze trends over time to understand what works best for you and make informed adjustments to your plan.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <LockOpenIcon className="text-green-500 mr-3 mt-1" style={{ fontSize: '28px' }} />
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800">Unlock Your Potential</h3>
                                            <p className="text-gray-600">
                                                With MacroZapp Premium, you’re not just tracking macros—you’re gaining the tools to transform your health and fitness journey. Join thousands of users who’ve taken control of their goals.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing and Checkout Section */}
                            <div className="text-center mb-6">
                                <p className="text-2xl font-bold text-gray-800 mb-2">Only $8.99 per Month</p>
                                <p className="text-gray-600 mb-4">Cancel anytime, no long-term commitment required.</p>
                            </div>

                            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                            {clientSecret ? (
                                <div className="border-t pt-6">
                                    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                                        <EmbeddedCheckout />
                                    </EmbeddedCheckoutProvider>
                                </div>
                            ) : (
                                <p className="text-center text-gray-600">Loading payment form...</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;