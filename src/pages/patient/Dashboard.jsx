import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, getUserAppointments } from '../../utils/database';
import { CrossIcon, StethoscopeIcon, CalendarIcon, SearchIcon, UserIcon, ClipboardIcon, MessageIcon, ActivityIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../../components/Icons';
import Chatbot from '../../components/Chatbot';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 });
    const [upcoming, setUpcoming] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.isAdmin) {
            navigate('/login');
        } else {
            setUser(currentUser);
            const appts = getUserAppointments(currentUser.id);
            setStats({
                total: appts.length,
                confirmed: appts.filter(a => a.status === 'Confirmed').length,
                completed: appts.filter(a => a.status === 'Completed').length,
                cancelled: appts.filter(a => a.status === 'Cancelled').length
            });
            // Find next upcoming
            const todayStr = new Date().toISOString().split('T')[0];
            const next = appts
                .filter(a => a.status === 'Confirmed' && a.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
            setUpcoming(next || null);
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (!user) return null;

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-left">
                    <div className="logo">
                        <span className="logo-icon"><CrossIcon size={18} color="#fff" /></span>
                        <span className="logo-text">CityCare</span>
                    </div>
                </div>

                <div className="nav-center">
                    <button onClick={() => navigate('/doctors')} className="nav-link">
                        <StethoscopeIcon size={18} /> Doctors
                    </button>
                    <button onClick={() => navigate('/my-bookings')} className="nav-link">
                        <CalendarIcon size={18} /> My Bookings
                    </button>
                </div>

                <div className="nav-right">
                    <span className="user-name" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                        <UserIcon size={18} /> {user.name}
                    </span>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-section">
                    <h1>{getGreeting()}, {user.name}!</h1>
                    <p>How can we help you today?</p>
                </div>

                {/* Stats */}
                <div className="dashboard-stats">
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon blue"><ClipboardIcon size={22} /></div>
                        <div><div className="dash-stat-val">{stats.total}</div><div className="dash-stat-lbl">Total Appointments</div></div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon green"><CheckCircleIcon size={22} /></div>
                        <div><div className="dash-stat-val">{stats.confirmed}</div><div className="dash-stat-lbl">Upcoming</div></div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon amber"><ClockIcon size={22} /></div>
                        <div><div className="dash-stat-val">{stats.completed}</div><div className="dash-stat-lbl">Completed</div></div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon red"><XCircleIcon size={22} /></div>
                        <div><div className="dash-stat-val">{stats.cancelled}</div><div className="dash-stat-lbl">Cancelled</div></div>
                    </div>
                </div>

                {/* Search */}
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
                            <button type="submit" className="search-button">
                                <SearchIcon size={18} /> Search
                            </button>
                        </div>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-picker"
                        />
                    </form>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <div className="action-card" onClick={() => navigate('/doctors')}>
                        <div className="card-icon doctors"><StethoscopeIcon size={26} /></div>
                        <h3>Browse Doctors</h3>
                        <p>View all available doctors and their specializations</p>
                    </div>

                    <div className="action-card" onClick={() => navigate('/my-bookings')}>
                        <div className="card-icon bookings"><CalendarIcon size={26} /></div>
                        <h3>My Appointments</h3>
                        <p>View and manage your bookings</p>
                    </div>

                    <div className="action-card" onClick={() => document.querySelector('.chatbot-button')?.click()}>
                        <div className="card-icon chat"><MessageIcon size={26} /></div>
                        <h3>Health Assistant</h3>
                        <p>Chat with our Health Assistant to understand your symptoms</p>
                    </div>
                </div>

                {/* Upcoming + Info */}
                <div className="info-section">
                    <div className="upcoming-card">
                        <h3><CalendarIcon size={18} /> Upcoming Appointment</h3>
                        {upcoming ? (
                            <div className="upcoming-detail">
                                <div>
                                    <div className="doc-name">{upcoming.doctorName}</div>
                                    <div className="doc-spec">{upcoming.specialization}</div>
                                    <div className="appt-meta">
                                        <CalendarIcon size={14} /> {upcoming.date} &nbsp;•&nbsp; {upcoming.timeSlot}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="no-upcoming">No upcoming appointments. Book one now!</p>
                        )}
                    </div>

                    <div className="info-card">
                        <h3><ActivityIcon size={18} /> Quick Health Tips</h3>
                        <ul>
                            <li>Stay hydrated — drink at least 8 glasses of water daily</li>
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
