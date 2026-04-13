import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getDoctorAppointments, respondToAppointment, logoutUser, autoExpirePendingAppointments } from '../../utils/supabaseDatabase';
import { CrossIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MessageIcon, StethoscopeIcon } from '../../components/Icons';
import './DoctorDashboard.css';

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Build "YYYY-MM-DD" from local time (avoids UTC offset problems in IST)
const localDateStr = (d = new Date()) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
};
const todayStr = () => localDateStr();
const getDayName = (dateStr) => DAYS_FULL[new Date(dateStr + 'T00:00').getDay()];

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [view, setView] = useState('schedule'); // 'schedule' | 'all'
    const [loadingAction, setLoadingAction] = useState(null);

    // Inline reject modal state (replaces prompt())
    const [rejectModal, setRejectModal] = useState({ open: false, id: null });
    const [rejectReason, setRejectReason] = useState('');

    const loadAppointments = useCallback(async () => {
        const user = getCurrentUser();
        if (!user || !user.isDoctor) { navigate('/doctor-login'); return; }
        setDoctor(user);
        const appts = await getDoctorAppointments(user.id);
        setAppointments(appts);
    }, [navigate]);

    useEffect(() => {
        // On first load: expire stale pending appointments, then load
        autoExpirePendingAppointments().then(() => loadAppointments());

        // Poll every 60 seconds for new pending requests
        const interval = setInterval(loadAppointments, 60000);
        return () => clearInterval(interval);
    }, [loadAppointments]);

    // Open reject modal instead of using prompt()
    const handleAction = async (apptId, action) => {
        if (action === 'rejected') {
            setRejectModal({ open: true, id: apptId });
            setRejectReason('');
            return;
        }

        // ── Optimistic update: change status in UI immediately ──
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: action } : a));
        setLoadingAction(apptId);

        // Fire API in background (sends email + persists to DB)
        const result = await respondToAppointment(apptId, action, '', doctor.name);
        if (!result.success) {
            // Rollback: restore real data from DB on failure
            alert(result.message);
            await loadAppointments();
        }
        setLoadingAction(null);
    };

    // Confirm rejection from modal
    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) return;
        const id = rejectModal.id;
        const reason = rejectReason.trim();
        setRejectModal({ open: false, id: null });
        setRejectReason('');

        // ── Optimistic update ──
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
        setLoadingAction(id);

        const result = await respondToAppointment(id, 'rejected', reason, doctor.name);
        if (!result.success) {
            alert(result.message);
            await loadAppointments(); // rollback
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
        pending:   appointments.filter(a => a.status === 'pending').length,
        accepted:  appointments.filter(a => a.status === 'accepted').length,
        today:     appointments.filter(a => a.status === 'accepted' && a.date === todayStr()).length,
        total:     appointments.length
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
                {/* ── Tab filters including expired ── */}
                {view === 'all' && (
                    <div className="doc-main-content">
                        <div className="doc-tabs">
                            {['pending', 'accepted', 'completed', 'rejected', 'cancelled', 'expired', 'all'].map(tab => (
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

            {/* ── Inline Reject Modal (replaces prompt()) ── */}
            {rejectModal.open && (
                <div className="modal-backdrop" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
                     onClick={() => setRejectModal({ open: false, id: null })}>
                    <div style={{ background:'#fff', borderRadius:12, width:400, padding:'28px 28px 24px', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}
                         onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin:'0 0 6px', color:'#1e293b', fontSize:'1.1rem' }}>Reject Appointment</h3>
                        <p style={{ margin:'0 0 16px', color:'#64748b', fontSize:'0.85rem' }}>Provide a reason — the patient will see this in their email and bookings.</p>
                        <textarea
                            rows={3}
                            autoFocus
                            placeholder="e.g. Fully booked for the day, emergency schedule change..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'0.9rem', resize:'vertical', outline:'none', boxSizing:'border-box' }}
                        />
                        <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'flex-end' }}>
                            <button onClick={() => setRejectModal({ open: false, id: null })}
                                    style={{ padding:'9px 18px', border:'1px solid #cbd5e1', borderRadius:7, background:'#fff', color:'#64748b', cursor:'pointer', fontWeight:500 }}>
                                Cancel
                            </button>
                            <button onClick={handleConfirmReject} disabled={!rejectReason.trim()}
                                    style={{ padding:'9px 18px', border:'none', borderRadius:7, background: rejectReason.trim() ? '#dc2626' : '#fca5a5', color:'#fff', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed', fontWeight:600 }}>
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
