import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import logoFull from './assets/images/logo-full.png'; // Import the full logo
import './App.css';

const NavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const navLinksRef = useRef<HTMLDivElement>(null); // Ref for the nav-links container

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    // Close menu when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if the menu is open and the click is outside the nav-links and hamburger icon
            if (
                isMenuOpen &&
                navLinksRef.current &&
                !navLinksRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('.hamburger-icon')
            ) {
                setIsMenuOpen(false);
            }
        };

        // Add event listener when the menu is open
        if (isMenuOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        // Clean up the event listener when the menu closes or component unmounts
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isMenuOpen]); // Re-run effect when isMenuOpen changes

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        setIsMenuOpen(false);
    };

    return (
        <nav className="nav-bar">
            {/* Wrapper for logo and hamburger icon */}
            <div className="nav-logo">
                <img src={logoFull} alt="Macrozapp Logo" className="nav-logo-img" />
            </div>
            <div className="nav-header">



                <div className="hamburger-icon" onClick={toggleMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

            {/* Navigation Links */}
            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`} ref={navLinksRef}>
                <ul>
                    <li>
                        <NavLink
                            to="/app/dashboard"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                toggleMenu();
                            }}
                        >
                            Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/goals"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                toggleMenu();
                            }}
                        >
                            Goals
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/food-maintenance"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                toggleMenu();
                            }}
                        >
                            Food Maintenance
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/logs"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                toggleMenu();
                            }}
                        >
                            Logs
                        </NavLink>
                    </li>
                    <li>
                        <button className="nav-button logout" onClick={handleLogout}>
                            Logout
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default NavBar;