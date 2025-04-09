import React from 'react';
import { Link } from 'react-router-dom';
import logoFull from '../assets/images/logo-full-nb.png'; // Import the full logo
import './LandingPage.css';

interface LandingPageProps {
    onInstallClick: (() => void) | null; // Add prop type for onInstallClick
}

const LandingPage: React.FC<LandingPageProps> = ({ onInstallClick }) => {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <header id="top" className="hero">
                <div className="hero-content">
                    <img src={logoFull} alt="Macrozapp Logo" className="hero-logo" />
                    {/* <p className="subtitle">
                        Track Your Macros, Achieve Your Goals, and Live Healthier
                    </p> */}
                    <div className="cta-buttons">
                        <Link to="/login" className="cta-button primary">
                            Log In
                        </Link>
                        <Link to="/signup" className="cta-button secondary">
                            Sign Up
                        </Link>
                        {/* Add Install App button if onInstallClick is available */}
                        {onInstallClick && (
                            <button onClick={onInstallClick} className="cta-button install">
                                Install App
                            </button>
                        )}
                    </div>
                    <a href="#about" className="learn-more">
                        Learn More
                    </a>
                </div>
            </header>

            {/* About Section */}
            <section id="about" className="about">
                <h2>About Macrozapp</h2>
                <p>
                    Macrozapp is a simple, user-focused app designed to help you track macros and achieve your fitness goals—on <em>your</em> terms. Unlike other apps that take a "one size fits all" approach with generic, overly verbose food lists, Macrozapp starts you with a curated selection of staple foods and goals that you can easily customize to fit your lifestyle.
                </p>
                <p>
                    With Macrozapp, you’re in control:
                </p>
                <ul>
                    <li>Create your own custom foods list for quick, personalized meal logging.</li>
                    <li>Set tailored macro tracking goals that align with your unique needs and preferences.</li>
                    <li>Start with a simple, practical foundation of staple foods and goals, then adapt them to your lifestyle and routine.</li>
                    <li>Enjoy a clutter-free experience that prioritizes simplicity and flexibility over rigid, pre-set options.</li>
                </ul>
                <p>
                    Whether you’re a fitness enthusiast, an athlete, or someone looking to improve your nutrition, Macrozapp empowers you to take charge of your health journey. Join thousands of users who have ditched the generic approach and embraced a tracking app that adapts to <em>them</em>. Start customizing your path to a healthier you today!
                </p>
                <a href="#top" className="back-to-top">
                    Back to Top
                </a>
            </section>

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

            {/* Testimonials Section */}
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