import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeDatabase } from './utils/database';

// Public Pages
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';

// Patient Pages
import Dashboard from './pages/patient/Dashboard';
import Doctors from './pages/patient/Doctors';
import MyBookings from './pages/patient/MyBookings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

import './App.css';

function App() {
  useEffect(() => {
    // Initialize database on app load
    initializeDatabase();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Patient Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/my-bookings" element={<MyBookings />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
