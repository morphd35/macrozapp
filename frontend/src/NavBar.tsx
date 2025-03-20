import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import './App.css';

const NavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation(); // Get the current route

    // Close the menu whenever the route changes
    useEffect(() => {
        setIsMenuOpen(false); // Close the menu on route change
    }, [location.pathname]); // Trigger when the pathname changes

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
            {/* Hamburger Icon for Mobile */}
            <div className="hamburger-icon" onClick={toggleMenu}>
                <span></span>
                <span></span>
                <span></span>
            </div>

            {/* Navigation Links */}
            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
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
                        <button className="nav-button" onClick={handleLogout}>
                            Logout
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default NavBar;