// frontend/src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <header className="hero">
                <div className="hero-content">
                    <h1>Macrozapp</h1>
                    <p className="subtitle">
                        Track Your Macros, Achieve Your Goals, and Live Healthier
                    </p>
                    <div className="cta-buttons">
                        <Link to="/login" className="cta-button primary">
                            Log In
                        </Link>
                        <Link to="/signup" className="cta-button secondary">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </header>

            {/* Features Section with Images */}
            <section className="features">
                <h2>Why Macrozapp?</h2>
                <div className="feature-grid">
                    <div className="feature-item">
                        <img
                            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd"
                            alt="Meal prepping with healthy containers"
                            className="feature-image"
                        />
                        <h3>Track Your Macros</h3>
                        <p>Log your meals effortlessly and monitor your macro intake to stay on target.</p>
                    </div>
                    <div className="feature-item">
                        <img
                            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"
                            alt="Person exercising"
                            className="feature-image"
                        />
                        <h3>Achieve Your Goals</h3>
                        <p>Set fitness and health goals, and watch your progress with easy tracking tools.</p>
                    </div>
                    <div className="feature-item">
                        <img
                            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"
                            alt="Healthy lifestyle"
                            className="feature-image"
                        />
                        <h3>Live Healthier</h3>
                        <p>Make informed choices with insights that support a balanced, healthy lifestyle.</p>
                    </div>
                </div>
            </section>

            {/* Testimonials Section (Optional) */}
            <section className="testimonials">
                <h2>What Users Are Saying</h2>
                <div className="testimonial-grid">
                    <div className="testimonial-item">
                        <p>"Macrozapp made tracking my macros so simple—I’ve never felt better!"</p>
                        <h4>— Alex, Fitness Enthusiast</h4>
                    </div>
                    <div className="testimonial-item">
                        <p>"I love how I can set goals and see my progress. It keeps me motivated!"</p>
                        <h4>— Sarah, Health Seeker</h4>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer>
                <p>© 2025 Macrozapp. All rights reserved.</p>
                <div className="footer-links">
                    <Link to="/terms">Terms of Service</Link>
                    <Link to="/privacy">Privacy Policy</Link>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;