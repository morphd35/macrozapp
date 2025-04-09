import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ThankYouPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to Dashboard after 3 seconds
        const timer = setTimeout(() => {
            navigate('/app/dashboard', { state: { paymentVerified: true } });
        }, 5000);

        return () => clearTimeout(timer); // Cleanup on unmount
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500">
            {/* Main Content */}
            <div className="flex justify-center items-center h-[calc(100vh-80px)] px-4">
                <div className="card">
                    <h1 className="payment-headline text-2xl font-bold mb-4">Thank You!</h1>
                    <p className="text-gray-600 mb-6">
                        Your subscription to MacroZapp Premium was successful! You now have access to all premium features, including food lookup, advanced goals, and 12 months of data storage. Redirecting to Dashboard...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ThankYouPage;