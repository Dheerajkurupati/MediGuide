import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser, getUserAppointments } from '../../utils/supabaseDatabase';
import { CrossIcon, StethoscopeIcon, CalendarIcon, UserIcon, ClipboardIcon, MessageIcon, ActivityIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../../components/Icons';
import Chatbot from '../../components/Chatbot';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 });
    const [upcoming, setUpcoming] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.isAdmin) {
            navigate('/login');
            return;
        }
        setUser(currentUser);

        const loadAppts = async () => {
            const appts = await getUserAppointments(currentUser.id);
            const _n = new Date();
            const todayStr = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}`;
            setStats({
                total: appts.length,
                confirmed: appts.filter(a => a.status === 'accepted' && a.date >= todayStr).length,
                completed: appts.filter(a => a.status === 'completed').length,
                cancelled: appts.filter(a => a.status === 'cancelled').length
            });
            const next = appts
                .filter(a => a.status === 'accepted' && a.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
            setUpcoming(next || null);
        };
        loadAppts();

        // Auto-open chatbot once per login session
        if (!sessionStorage.getItem('chatbot_auto_opened')) {
            sessionStorage.setItem('chatbot_auto_opened', '1');
            setTimeout(() => {
                document.getElementById('chatbot-toggle-btn')?.click();
            }, 1500);
        }
    }, [navigate]);

    const handleLogout = () => {
        logoutUser();
        sessionStorage.removeItem('chatbot_auto_opened'); // Reset so it auto-opens on next login
        navigate('/');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getGreetingEmoji = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '🌤️';
        if (hour < 17) return '☀️';
        return '🌙';
    };

    if (!user) return null;

    const firstName = user.name?.split(' ')[0] || user.name;

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

                {/* ── Hero Banner ── */}
                <div className="hero-banner">
                    <div className="hero-left">
                        <div className="hero-greeting">{getGreeting()} {getGreetingEmoji()}</div>
                        <h1 className="hero-name">{firstName}!</h1>
                        <p className="hero-sub">Your health is our priority. Here's your overview for today.</p>
                        <div className="hero-actions">
                            <button className="hero-btn primary" onClick={() => navigate('/doctors')}>
                                <StethoscopeIcon size={15} /> Book Appointment
                            </button>
                            <button className="hero-btn secondary" onClick={() => navigate('/my-bookings')}>
                                <CalendarIcon size={15} /> My Bookings
                            </button>
                        </div>
                    </div>
                    <div className="hero-right">
                        <div className="hero-illustration">🏥</div>
                    </div>
                </div>

                {/* ── Stats ── */}
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

                {/* ── Upcoming Appointment ── */}
                <div className="upcoming-banner">
                    <div className="upcoming-banner-header">
                        <CalendarIcon size={18} /> Next Appointment
                    </div>
                    {upcoming ? (
                        <div className="upcoming-banner-content">
                            <div className="upcoming-banner-doc">
                                <div className="upcoming-doc-avatar">👨‍⚕️</div>
                                <div>
                                    <div className="upcoming-doc-name">{upcoming.doctorName}</div>
                                    <div className="upcoming-doc-spec">{upcoming.specialization}</div>
                                </div>
                            </div>
                            <div className="upcoming-banner-divider" />
                            <div className="upcoming-banner-meta">
                                <div className="upcoming-meta-item">
                                    <span className="meta-label">📅 Date</span>
                                    <span className="meta-val">{upcoming.date}</span>
                                </div>
                                <div className="upcoming-meta-item">
                                    <span className="meta-label">⏰ Time</span>
                                    <span className="meta-val">{upcoming.timeSlot}</span>
                                </div>
                                <div className="upcoming-meta-item">
                                    <span className="meta-label">Status</span>
                                    <span className="meta-val status-confirmed">✅ Confirmed</span>
                                </div>
                            </div>
                            <button className="upcoming-view-btn" onClick={() => navigate('/my-bookings')}>
                                View Details →
                            </button>
                        </div>
                    ) : (
                        <div className="no-upcoming-banner">
                            <span className="no-upcoming-icon">📭</span>
                            <div>
                                <p className="no-upcoming-title">No upcoming appointments</p>
                                <p className="no-upcoming-sub">Browse our doctors and book a consultation to get started.</p>
                            </div>
                            <button className="hero-btn primary" onClick={() => navigate('/doctors')}>Book Now</button>
                        </div>
                    )}
                </div>

                {/* ── Quick Actions ── */}
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

                    <div className="action-card" onClick={() => document.getElementById('chatbot-toggle-btn')?.click()}>
                        <div className="card-icon chat"><MessageIcon size={26} /></div>
                        <h3>Health Assistant</h3>
                        <p>Chat with our AI to understand your symptoms</p>
                    </div>
                </div>

                {/* ── Bottom Row: Health Tips + MediGuide Promo ── */}
                <div className="info-section">
                    <div className="info-card">
                        <h3><ActivityIcon size={18} /> Quick Health Tips</h3>
                        <ul className="health-tips-list">
                            <li><span className="tip-icon">💧</span><span>Stay hydrated — drink at least 8 glasses of water daily</span></li>
                            <li><span className="tip-icon">🏃</span><span>Regular exercise improves overall health and mood</span></li>
                            <li><span className="tip-icon">😴</span><span>Get 7–8 hours of quality sleep every night</span></li>
                            <li><span className="tip-icon">🩺</span><span>Don't skip regular health checkups</span></li>
                            <li><span className="tip-icon">🥗</span><span>Eat a balanced diet rich in vegetables and fruits</span></li>
                        </ul>
                    </div>

                    <div className="mediguide-promo">
                        <div className="promo-badge">💡 Smart Guide</div>
                        <div className="promo-icon">🤖</div>
                        <h3>MediGuide Health Assistant</h3>
                        <p>Describe your symptoms and our rule-based chatbot will guide you to the right specialist. Get instant, structured health guidance.</p>
                        <div className="promo-features">
                            <span className="promo-feature-pill">✅ Symptom Guidance</span>
                            <span className="promo-feature-pill">✅ Doctor Recommendations</span>
                            <span className="promo-feature-pill">✅ Available 24/7</span>
                        </div>
                        <button className="promo-btn" onClick={() => document.getElementById('chatbot-toggle-btn')?.click()}>
                            💬 Start Chatting
                        </button>
                    </div>
                </div>

            </div>

            <Chatbot />
        </div>
    );
};

export default Dashboard;
