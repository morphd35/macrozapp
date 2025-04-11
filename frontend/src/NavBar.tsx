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
            if (
                isMenuOpen &&
                navLinksRef.current &&
                !navLinksRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('.hamburger-icon')
            ) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isMenuOpen]);

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

            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`} ref={navLinksRef}>
                <ul>
                    <li>
                        <NavLink
                            to="/app/dashboard"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={toggleMenu}
                        >
                            Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/goals"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={toggleMenu}
                        >
                            Goals
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/food-maintenance"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={toggleMenu}
                        >
                            Food Maintenance
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/logs"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={toggleMenu}
                        >
                            Logs
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/app/settings"
                            className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                            onClick={toggleMenu}
                        >
                            Settings
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