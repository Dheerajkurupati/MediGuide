import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner';

// Public Auth Pages
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';

// Patient Pages
import Dashboard from './pages/patient/Dashboard';
import Doctors from './pages/patient/Doctors';
import MyBookings from './pages/patient/MyBookings';
import Profile from './pages/patient/Profile';

// Doctor Pages
import DoctorLogin from './pages/DoctorLogin';
import DoctorDashboard from './pages/doctor/DoctorDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <OfflineBanner />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Password Reset Flow */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Patient Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/profile" element={<Profile />} />

          {/* Doctor Routes */}
          <Route path="/doctor-login" element={<DoctorLogin />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
