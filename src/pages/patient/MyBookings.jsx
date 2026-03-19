import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserAppointments, getCurrentUser, cancelAppointment } from '../../utils/database';
import './MyBookings.css';
import { CrossIcon, CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, MessageIcon } from '../../components/Icons';

const MyBookings = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState('All');
    const [cancellingId, setCancellingId] = useState(null);

    const loadAppointments = useCallback(() => {
        const user = getCurrentUser();
        if (!user || user.isAdmin) { navigate('/login'); return; }
        setAppointments(getUserAppointments(user.id));
    }, [navigate]);

    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    const handleCancel = (appointmentId) => {
        const reason = prompt('Please enter a reason for cancellation:');
        if (!reason) return;   // user clicked Cancel or entered nothing — do nothing
        setCancellingId(appointmentId);
        setTimeout(() => {
            cancelAppointment(appointmentId, reason);
            loadAppointments();
            setCancellingId(null);
        }, 400);
    };

    const statusColors = {
        Confirmed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
        Cancelled: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
        Completed: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' }
    };

    const FILTERS = ['All', 'Confirmed', 'Cancelled', 'Completed'];

    const filtered = filter === 'All' ? appointments : appointments.filter(a => a.status === filter);

    const getDayName = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr + 'T00:00').getDay()];
    };

    const canCancel = (appt) =>
        appt.status === 'Confirmed' &&
        new Date(`${appt.date}T00:00`) >= new Date(new Date().toDateString());

    return (
        <div className="my-bookings-page">
            <nav className="patient-nav">
                <div className="nav-inner">
                    <span className="nav-logo" onClick={() => navigate('/dashboard')}><CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />CityCare</span>
                    <div className="nav-links">
                        <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <span onClick={() => navigate('/doctors')}>Doctors</span>
                        <span className="active">My Bookings</span>
                    </div>
                    <button className="logout-btn" onClick={() => { localStorage.removeItem('citycare_current_user'); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="bookings-container">
                <div className="bookings-header">
                    <div>
                        <h1>My Appointments</h1>
                        <p>{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} total</p>
                    </div>
                    <button className="new-booking-btn" onClick={() => navigate('/doctors')}>
                        + Book New Appointment
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                            {f !== 'All' && <span className="tab-count">{appointments.filter(a => a.status === f).length}</span>}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <span><CalendarIcon size={40} color="#94a3b8" /></span>
                        <h3>{filter === 'All' ? 'No appointments yet' : `No ${filter} appointments`}</h3>
                        <p>Book your first appointment with one of our specialists.</p>
                        <button onClick={() => navigate('/doctors')}>Browse Doctors</button>
                    </div>
                ) : (
                    <div className="bookings-list">
                        {filtered.map(appt => {
                            const style = statusColors[appt.status] || statusColors.Confirmed;
                            return (
                                <div className="booking-card" key={appt.id}>
                                    <div className="booking-card-left">
                                        <div className="booking-date-block">
                                            <span className="appt-day">{getDayName(appt.date).slice(0, 3)}</span>
                                            <span className="appt-date-num">{appt.date.split('-')[2]}</span>
                                            <span className="appt-month">{new Date(appt.date + 'T00:00').toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                    </div>

                                    <div className="booking-card-body">
                                        <div className="booking-top-row">
                                            <div>
                                                <h3 className="booking-doctor">{appt.doctorName}</h3>
                                                <p className="booking-spec">{appt.specialization}</p>
                                            </div>
                                            <span
                                                className="status-badge"
                                                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
                                            >
                                                {appt.status === 'Confirmed' ? <CheckCircleIcon size={14} /> :
                                                    appt.status === 'Cancelled' ? <XCircleIcon size={14} /> : <CheckCircleIcon size={14} />} {appt.status}
                                            </span>
                                        </div>

                                        <div className="booking-meta">
                                            <span><ClockIcon size={14} /> {appt.timeSlot}</span>
                                            <span>#{appt.id}</span>
                                        </div>

                                        {appt.reason && (
                                            <p className="booking-reason"><MessageIcon size={14} /> {appt.reason}</p>
                                        )}

                                        {appt.status === 'Cancelled' && appt.cancelReason && (
                                            <p className="booking-reason" style={{ color: '#dc2626' }}>Cancel reason: {appt.cancelReason}</p>
                                        )}

                                        <div className="booking-footer-row">
                                            <span className="booked-on">Booked: {new Date(appt.createdAt).toLocaleDateString()}</span>
                                            {canCancel(appt) && (
                                                <button
                                                    className="cancel-appt-btn"
                                                    onClick={() => handleCancel(appt.id)}
                                                    disabled={cancellingId === appt.id}
                                                >
                                                    {cancellingId === appt.id ? 'Cancelling...' : '✕ Cancel'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBookings;
