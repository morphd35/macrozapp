// frontend/src/pages/Privacy.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './PublicPages.css';

const Privacy: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
            <h2>Privacy Policy</h2>
            <p>
                At Macrozapp, we value your privacy. Here’s how we handle your data:
            </p>
            <ul>
                <li>For free accounts, we may use your email for marketing purposes, but you can opt out.</li>
                <li>Paid accounts are exempt from email marketing use.</li>
                <li>We never sell your personal tracking data (macros, weight, goals).</li>
                <li>More details to be added as the app grows.</li>
            </ul>
            <p>
                Back to <Link to="/signup">Sign Up</Link> or <Link to="/login">Log In</Link>.
            </p>
        </div>
    );
};

export default Privacy;