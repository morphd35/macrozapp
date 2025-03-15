// frontend/src/pages/Terms.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './PublicPages.css';

const Terms: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
            <h2>Terms of Service</h2>
            <p>
                Welcome to Macrozapp! By using our app, you agree to the following terms:
            </p>
            <ul>
                <li>
                    <strong>Account Usage:</strong> You are responsible for maintaining the confidentiality of your account credentials. Macrozapp is not liable for any unauthorized access to your account.
                </li>
                <li>
                    <strong>Data Usage (Free Version):</strong> For free accounts, we reserve the right to use your email for marketing purposes. You can opt out at any time by contacting us or adjusting your account settings.
                </li>
                <li>
                    <strong>Data Usage (Paid Version):</strong> Paid accounts are exempt from email marketing use, ensuring your email remains private.
                </li>
                <li>
                    <strong>Personal Data:</strong> We will never sell your personal tracking data (macros, weight, goals). Your health data remains yours.
                </li>
                <li>
                    <strong>Service Availability:</strong> Macrozapp is provided "as is." We strive to ensure availability but are not liable for downtime or data loss.
                </li>
                <li>
                    <strong>Future Updates:</strong> These terms may be updated as Macrozapp grows, especially with the introduction of paid tiers and support for 20+ clinics.
                </li>
            </ul>
            <p>
                If you have any questions about these terms, please contact us at support@macrozapp.com (placeholder email).
            </p>
            <p>
                Back to <Link to="/signup">Sign Up</Link> or <Link to="/login">Log In</Link>.
            </p>
        </div>
    );
};

export default Terms;