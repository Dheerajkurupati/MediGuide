import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../utils/database';
import Chatbot from '../../components/Chatbot';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.isAdmin) {
            navigate('/login');
        } else {
            setUser(currentUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim() || selectedDate) {
            navigate(`/doctors?search=${searchQuery}&date=${selectedDate}`);
        }
    };

    if (!user) return null;

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-left">
                    <div className="logo">
                        <span className="logo-icon">🏥</span>
                        <span className="logo-text">CityCare</span>
                    </div>
                </div>

                <div className="nav-center">
                    <button onClick={() => navigate('/doctors')} className="nav-link">
                        👨‍⚕️ Doctors
                    </button>
                    <button onClick={() => navigate('/my-bookings')} className="nav-link">
                        📅 My Bookings
                    </button>
                </div>

                <div className="nav-right">
                    <span className="user-name">👤 {user.name}</span>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-section">
                    <h1>Welcome back, {user.name}! 👋</h1>
                    <p>How can we help you today?</p>
                </div>

                <div className="search-section">
                    <form onSubmit={handleSearch} className="search-bar-container">
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder="Search for doctors, specializations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" className="search-button">🔍 Search</button>
                        </div>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-picker"
                        />
                    </form>
                </div>

                <div className="quick-actions">
                    <div className="action-card" onClick={() => navigate('/doctors')}>
                        <div className="card-icon">👨‍⚕️</div>
                        <h3>Browse Doctors</h3>
                        <p>View all available doctors and their specializations</p>
                    </div>

                    <div className="action-card" onClick={() => navigate('/my-bookings')}>
                        <div className="card-icon">📋</div>
                        <h3>My Appointments</h3>
                        <p>View and manage your bookings</p>
                    </div>

                    <div className="action-card" onClick={() => document.querySelector('.chatbot-button').click()}>
                        <div className="card-icon">💬</div>
                        <h3>Health Assistant</h3>
                        <p>Chat with our AI to understand your symptoms</p>
                    </div>
                </div>

                <div className="info-section">
                    <div className="info-card">
                        <h3>🎯 How It Works</h3>
                        <ol>
                            <li>Chat with our AI assistant about your symptoms</li>
                            <li>Get personalized doctor recommendations</li>
                            <li>Book appointments with available specialists</li>
                            <li>Receive confirmation and manage bookings</li>
                        </ol>
                    </div>

                    <div className="info-card tips-card">
                        <h3>💡 Health Tips</h3>
                        <ul>
                            <li>Stay hydrated - drink at least 8 glasses of water daily</li>
                            <li>Regular exercise improves overall health</li>
                            <li>Get 7-8 hours of quality sleep</li>
                            <li>Don't skip regular health checkups</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Chatbot />
        </div>
    );
};

export default Dashboard;
