import React, { useState, useEffect } from 'react'; // Add useState and useEffect
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Adjust the path as needed
import NavBar from './NavBar';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import FoodMaintenance from './pages/FoodMaintenance';
import Logs from './pages/Logs';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import PaymentPage from './pages/PaymentPage';
import PaymentOneTime from './pages/PaymentOneTime';
import ThankYouPage from './pages/ThankyouPage';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import Settings from './pages/SettingsPage'
import './App.css';

// AppLayout remains unchanged
const AppLayout = () => (
  <div className="app-container">
    <NavBar />
    <main>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="goals" element={<Goals />} />
        <Route path="food-maintenance" element={<FoodMaintenance />} />
        <Route path="logs" element={<Logs />} />
        <Route path="settings" element={<Settings />} /> {/* Add Settings */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </main>
  </div>
);

// New layout for public routes that need the NavBar (e.g., /payment, /thank-you)
const PublicLayoutWithNav = () => (
  <div className="app-container">
    <NavBar />
    <main>
      <Routes>
        {/* Subscription Payment Routes */}
        <Route path="payment" element={<PaymentPage />} />
        <Route path="payment-success" element={<PaymentPage />} />
        <Route path="payment-cancel" element={<PaymentPage />} />
        {/* One-Time Payment Routes */}
        <Route path="payment-onetime" element={<PaymentOneTime />} />
        <Route path="payment-success-onetime" element={<PaymentOneTime />} />
        <Route path="payment-cancel" element={<PaymentPage />} /> {/* Reuse cancel page */}
        {/* Generic Thank You Page */}
        <Route path="thank-you" element={<ThankYouPage />} />
      </Routes>
    </main>
  </div>
);

// Update AppContent to handle the PWA install prompt
const AppContent = () => {
  // Add state to store the deferred prompt event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Add useEffect to listen for the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // Prevent the default mini-infobar from appearing
      setDeferredPrompt(e); // Store the event so we can trigger it later
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []); // Empty dependency array means this runs once on mount

  // Function to trigger the install prompt
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt(); // Show the install prompt
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null); // Clear the prompt after use
      });
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={<LandingPage onInstallClick={deferredPrompt ? handleInstallClick : null} />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />

      {/* Public Routes with NavBar */}
      <Route path="/*" element={<PublicLayoutWithNav />} /> {/* Change path to "/*" */}

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
};

// App remains unchanged
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;