import React from "react";
import { NavLink } from "react-router-dom";

const NavBar: React.FC = () => {
    return (
        <header className="nav-shell">
            <div className="nav-content">
                <div className="nav-brand">
                    <div className="nav-logo">MZ</div>
                    MoveZapp
                </div>
                <nav className="nav-links">
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/today">
                        Today
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/start">
                        Start
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/activity">
                        Activity
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/progress">
                        Progress
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/history">
                        History
                    </NavLink>
                </nav>
            </div>
        </header>
    );
};

export default NavBar;
