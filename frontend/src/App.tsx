// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate } from 'react-router-dom';
import NavBar from './NavBar';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import FoodMaintenance from './pages/FoodMaintenance';
import Logs from './pages/Logs';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import './App.css';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';

const AppLayout = () => (
  <div className="app-container">
    {/* Use NavBar component instead of hardcoded nav */}
    <NavBar />
    <main>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} /> {/* Relative path */}
        <Route path="goals" element={<Goals />} /> {/* Relative path */}
        <Route path="food-maintenance" element={<FoodMaintenance />} /> {/* Relative path */}
        <Route path="logs" element={<Logs />} /> {/* Relative path */}
        <Route path="*" element={<Navigate to="dashboard" replace />} /> {/* Relative redirect */}
      </Routes>
    </main>
  </div>
);

const AppContent = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />

    {/* Protected App Routes */}
    <Route
      path="/app/*"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    />
  </Routes>
);

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;