import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getDoctorAppointments, respondToAppointment, logoutUser } from '../../utils/supabaseDatabase';
import { CrossIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MessageIcon, StethoscopeIcon } from '../../components/Icons';
import './DoctorDashboard.css';

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayStr = () => new Date().toISOString().split('T')[0];
const getDayName = (dateStr) => DAYS_FULL[new Date(dateStr + 'T00:00').getDay()];

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [view, setView] = useState('schedule'); // 'schedule' | 'all'
    const [loadingAction, setLoadingAction] = useState(null);

    const loadAppointments = useCallback(async () => {
        const user = getCurrentUser();
        if (!user || !user.isDoctor) { navigate('/doctor-login'); return; }
        setDoctor(user);
        const appts = await getDoctorAppointments(user.id);
        setAppointments(appts);
    }, [navigate]);

    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    const handleAction = async (apptId, action) => {
        let note = '';
        if (action === 'rejected') {
            note = prompt('Please provide a reason for rejecting (patient will see this):');
            if (!note) return;
        }
        setLoadingAction(apptId);
        const result = await respondToAppointment(apptId, action, note, doctor.name);
        if (result.success) {
            await loadAppointments();
        } else {
            alert(result.message);
        }
        setLoadingAction(null);
    };

    if (!doctor) return null;

    // ── Derived Data ──
    const availableDays = doctor.availableDays || [];
    const selectedDayName = getDayName(selectedDate);
    const isDoctorAvailableOnSelected = availableDays.includes(selectedDayName);

    // Appointments for the selected date
    const dateAppointments = appointments.filter(a => a.date === selectedDate);

    // Stats
    const stats = {
        pending: appointments.filter(a => a.status === 'pending').length,
        accepted: appointments.filter(a => a.status === 'accepted').length,
        today: appointments.filter(a => a.status === 'accepted' && a.date === todayStr()).length,
        total: appointments.length
    };

    // All-appointments view (filtered by status)
    const allFiltered = statusFilter === 'all'
        ? appointments
        : appointments.filter(a => a.status === statusFilter);

    return (
        <div className="doc-portal-page">
            {/* ── Navbar ── */}
            <nav className="doc-nav">
                <div className="nav-inner">
                    <span className="nav-logo">
                        <CrossIcon size={18} color="#fff" /> Doctor Portal
                    </span>
                    <div className="doc-nav-tabs">
                        <button
                            className={`doc-nav-tab ${view === 'schedule' ? 'active' : ''}`}
                            onClick={() => setView('schedule')}
                        >
                            <CalendarIcon size={15} /> Schedule
                        </button>
                        <button
                            className={`doc-nav-tab ${view === 'all' ? 'active' : ''}`}
                            onClick={() => setView('all')}
                        >
                            <StethoscopeIcon size={15} /> All Appointments
                            {stats.pending > 0 && <span className="nav-badge">{stats.pending}</span>}
                        </button>
                    </div>
                    <div className="nav-right">
                        <span className="doc-name-badge">{doctor.name}</span>
                        <button className="logout-btn" onClick={() => { logoutUser(); navigate('/'); }}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="doc-container">
                {/* ── Header ── */}
                <div className="doc-header">
                    <div>
                        <h1>Welcome, {doctor.name}</h1>
                        <p>{doctor.specialization} • {doctor.designation}</p>
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="doc-stats-grid">
                    <div className="doc-stat-card pending" onClick={() => { setView('all'); setStatusFilter('pending'); }}>
                        <div className="stat-val">{stats.pending}</div>
                        <div className="stat-lbl">⏳ Pending Requests</div>
                    </div>
                    <div className="doc-stat-card accepted" onClick={() => { setView('all'); setStatusFilter('accepted'); }}>
                        <div className="stat-val">{stats.accepted}</div>
                        <div className="stat-lbl">✅ Accepted</div>
                    </div>
                    <div className="doc-stat-card today">
                        <div className="stat-val">{stats.today}</div>
                        <div className="stat-lbl">📅 Today's Appointments</div>
                    </div>
                    <div className="doc-stat-card total" onClick={() => { setView('all'); setStatusFilter('all'); }}>
                        <div className="stat-val">{stats.total}</div>
                        <div className="stat-lbl">📋 Total All-Time</div>
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    SCHEDULE VIEW (Calendar + Day Slots)
                ══════════════════════════════════════ */}
                {view === 'schedule' && (
                    <div className="schedule-view">

                        {/* Day Availability Chips */}
                        <div className="schedule-header">
                            <h2>My Schedule</h2>
                            <p>Your available working days are highlighted below</p>
                        </div>

                        <div className="availability-panel">
                            <div className="avail-label">My Available Days:</div>
                            <div className="day-chips-row">
                                {DAYS_SHORT.map((short, i) => {
                                    const full = DAYS_FULL[i];
                                    const isAvail = availableDays.includes(full);
                                    return (
                                        <span key={short} className={`day-chip-lg ${isAvail ? 'chip-on' : 'chip-off'}`}>
                                            {short}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="date-picker-bar">
                            <CalendarIcon size={18} color="#4338ca" />
                            <label>Select Date:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="date-picker-input"
                            />
                            <span className={`day-status-pill ${isDoctorAvailableOnSelected ? 'avail' : 'unavail'}`}>
                                {selectedDayName} — {isDoctorAvailableOnSelected ? '✓ You are available' : '✗ Not your working day'}
                            </span>
                            <button className="today-btn" onClick={() => setSelectedDate(todayStr())}>
                                Jump to Today
                            </button>
                        </div>

                        {/* Appointments for Selected Date */}
                        <div className="date-appts-section">
                            <h3 className="date-appts-title">
                                Appointments on {selectedDayName}, {selectedDate}
                                <span className="date-count-badge">{dateAppointments.length}</span>
                            </h3>

                            {dateAppointments.length === 0 ? (
                                <div className="doc-empty-state">
                                    <CalendarIcon size={40} color="#94a3b8" />
                                    <h3>No appointments on this date</h3>
                                    <p>{isDoctorAvailableOnSelected ? 'No bookings yet for this day.' : 'This is not one of your working days.'}</p>
                                </div>
                            ) : (
                                <div className="doc-appointments-list">
                                    {dateAppointments.map(appt => (
                                        <AppointmentCard
                                            key={appt.id}
                                            appt={appt}
                                            loadingAction={loadingAction}
                                            onAction={handleAction}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════
                    ALL APPOINTMENTS VIEW
                ══════════════════════════════════════ */}
                {view === 'all' && (
                    <div className="doc-main-content">
                        <div className="doc-tabs">
                            {['pending', 'accepted', 'completed', 'rejected', 'cancelled', 'all'].map(tab => (
                                <button
                                    key={tab}
                                    className={`doc-tab ${statusFilter === tab ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(tab)}
                                >
                                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    {tab === 'pending' && stats.pending > 0 && (
                                        <span className="tab-badge">{stats.pending}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="doc-appointments-list">
                            {allFiltered.length === 0 ? (
                                <div className="doc-empty-state">
                                    <CalendarIcon size={40} color="#94a3b8" />
                                    <h3>No {statusFilter === 'all' ? '' : statusFilter} appointments</h3>
                                    <p>Nothing to show here right now.</p>
                                </div>
                            ) : (
                                allFiltered.map(appt => (
                                    <AppointmentCard
                                        key={appt.id}
                                        appt={appt}
                                        loadingAction={loadingAction}
                                        onAction={handleAction}
                                        showDate
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Reusable Appointment Card ──
const AppointmentCard = ({ appt, loadingAction, onAction, showDate = false }) => (
    <div className={`doc-appt-card status-${appt.status}`}>
        <div className="appt-card-top">
            <div className="patient-info">
                <h3>{appt.patientName}</h3>
                <p>{appt.patientPhone}</p>
            </div>
            <div className="appt-time-info">
                {showDate && <span><CalendarIcon size={13}/> {appt.date} ({['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(appt.date+'T00:00').getDay()]})</span>}
                <span><ClockIcon size={13}/> {appt.timeSlot}</span>
                <span className={`mini-status-badge status-${appt.status}`}>
                    {appt.status.toUpperCase()}
                </span>
            </div>
        </div>

        {appt.reason && (
            <div className="appt-reason-box">
                <MessageIcon size={14}/> <span><strong>Reason:</strong> {appt.reason}</span>
            </div>
        )}

        {appt.cancelReason && (appt.status === 'rejected' || appt.status === 'cancelled') && (
            <div className="appt-reason-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <XCircleIcon size={14}/> <span><strong>Note:</strong> {appt.cancelReason}</span>
            </div>
        )}

        <div className="appt-card-bottom">
            <div className="appt-ref">Ref: #{appt.id}</div>
            <div className="appt-actions">
                {appt.status === 'pending' && (
                    <>
                        <button
                            className="btn-reject"
                            disabled={loadingAction === appt.id}
                            onClick={() => onAction(appt.id, 'rejected')}
                        >
                            <XCircleIcon size={14}/> Reject
                        </button>
                        <button
                            className="btn-accept"
                            disabled={loadingAction === appt.id}
                            onClick={() => onAction(appt.id, 'accepted')}
                        >
                            <CheckCircleIcon size={14}/> Accept
                        </button>
                    </>
                )}
                {appt.status === 'accepted' && (
                    <button
                        className="btn-complete"
                        disabled={loadingAction === appt.id}
                        onClick={() => onAction(appt.id, 'completed')}
                    >
                        <CheckCircleIcon size={14}/> Mark Completed
                    </button>
                )}
            </div>
        </div>
    </div>
);

export default DoctorDashboard;
