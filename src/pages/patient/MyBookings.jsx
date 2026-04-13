import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserAppointments, getCurrentUser, cancelAppointment } from '../../utils/supabaseDatabase';
import html2pdf from 'html2pdf.js';
import './MyBookings.css';
import { CrossIcon, CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, MessageIcon } from '../../components/Icons';

const FILTERS = ['All', 'pending', 'accepted', 'completed', 'rejected', 'cancelled', 'expired'];

// ── Helper: parse slot time string "09:00 AM" → Date on given date ──
const parseSlotDateTime = (dateStr, timeSlot) => {
    if (!dateStr || !timeSlot) return null;
    const [timePart, meridiem] = timeSlot.split(' ');
    if (!timePart || !meridiem) return null;
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
};

const MyBookings = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState('All');
    const [cancellingId, setCancellingId] = useState(null);

    // ── Inline cancel modal state (replaces prompt()) ──────────
    const [cancelModal, setCancelModal] = useState({ open: false, id: null });
    const [cancelReason, setCancelReason] = useState('');

    const loadAppointments = useCallback(async () => {
        const user = getCurrentUser();
        if (!user) { navigate('/login'); return; }
        if (user.isAdmin) { navigate('/login'); return; }
        if (user.isDoctor) { navigate('/doctor-login'); return; }
        const appts = await getUserAppointments(user.id);
        setAppointments(appts);
    }, [navigate]);

    useEffect(() => {
        loadAppointments();
        // Auto-refresh every 30s so status changes from doctor show up
        const interval = setInterval(loadAppointments, 30000);
        return () => clearInterval(interval);
    }, [loadAppointments]);

    // ── Open cancel modal ──────────────────────────────────────
    const openCancelModal = (id) => {
        setCancelModal({ open: true, id });
        setCancelReason('');
    };

    // ── Confirm cancel (from modal) ────────────────────────────
    const handleConfirmCancel = async () => {
        if (!cancelReason.trim()) return;
        setCancellingId(cancelModal.id);
        setCancelModal({ open: false, id: null });
        await cancelAppointment(cancelModal.id, cancelReason.trim());
        await loadAppointments();
        setCancellingId(null);
        setCancelReason('');
    };

    // ── Generate & Download Appointment Slip (Direct Download) ──
    const handleDownloadSlip = (appt) => {
        const user = getCurrentUser();
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        element.style.color = '#1e293b';
        element.innerHTML = `
            <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; max-width: 500px; margin: 0 auto; background: white;">
                <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px;">
                    <h1 style="margin: 0; color: #2563eb; font-size: 24px;">CityCare Hospital</h1>
                    <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Official Appointment Slip</p>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Patient Name:</span>
                    <span style="font-weight: 700; font-size: 15px;">${user?.name || 'Patient'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Doctor:</span>
                    <span style="font-weight: 700; font-size: 15px;">${appt.doctorName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Specialization:</span>
                    <span style="font-weight: 700; font-size: 15px;">${appt.specialization}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Date:</span>
                    <span style="font-weight: 700; font-size: 15px;">${appt.date}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Time:</span>
                    <span style="font-weight: 700; font-size: 15px;">${appt.timeSlot}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Booking ID:</span>
                    <span style="font-weight: 700; font-size: 15px;">#${appt.id}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600; font-size: 14px;">Status:</span>
                    <span style="font-weight: 700; font-size: 15px; color: #16a34a;">✅ Confirmed</span>
                </div>
                
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    Please present this slip at the reception upon arrival.<br/>
                    Arrive 10 minutes before your scheduled time.<br/>
                    Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
            </div>
        `;

        const opt = {
            margin:       0.5,
            filename:     `Appointment-Slip-${appt.id}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

    // ── Fix: check actual slot time, not just date ─────────────
    const canCancel = (appt) => {
        if (appt.status !== 'pending' && appt.status !== 'accepted') return false;
        const slotDT = parseSlotDateTime(appt.date, appt.timeSlot);
        if (!slotDT) return false;
        return slotDT > new Date(); // Only allow cancel if slot is in the future
    };

    const statusColors = {
        pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
        accepted: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
        rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
        completed: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
        cancelled: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
        expired: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
    };

    const STATUS_LABELS = {
        pending: 'Pending — Awaiting Doctor',
        accepted: 'Accepted',
        rejected: 'Rejected',
        completed: 'Completed',
        cancelled: 'Cancelled by Patient',
        expired: 'Expired — No Response'
    };

    const filtered = filter === 'All' ? appointments : appointments.filter(a => a.status === filter);

    const getDayName = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr + 'T00:00').getDay()];
    };

    return (
        <div className="my-bookings-page">
            <nav className="patient-nav-dark">
                <div className="pnd-inner">
                    <div className="pnd-logo" onClick={() => navigate('/dashboard')}>
                        <span className="pnd-logo-icon"><CrossIcon size={18} color="#fff" /></span>
                        <span>CityCare</span>
                    </div>
                    <div className="pnd-links">
                        <button className="pnd-link" onClick={() => navigate('/dashboard')}>Dashboard</button>
                        <button className="pnd-link" onClick={() => navigate('/doctors')}>Doctors</button>
                        <button className="pnd-link active">My Bookings</button>
                    </div>
                    <div className="pnd-right">
                        <button className="pnd-link" onClick={() => navigate('/profile')}>👤 Profile</button>
                        <button className="pnd-logout" onClick={() => { localStorage.removeItem('citycare_current_user'); navigate('/'); }}>Logout</button>
                    </div>
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
                            {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
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
                            const style = statusColors[appt.status] || statusColors.pending;
                            const label = STATUS_LABELS[appt.status] || appt.status;

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
                                                {appt.status === 'accepted' ? <CheckCircleIcon size={14} /> :
                                                    appt.status === 'completed' ? <CheckCircleIcon size={14} /> :
                                                        appt.status === 'expired' ? <ClockIcon size={14} /> :
                                                            appt.status === 'rejected' ? <XCircleIcon size={14} /> :
                                                                appt.status === 'cancelled' ? <XCircleIcon size={14} /> :
                                                                    <ClockIcon size={14} />} {label}
                                            </span>
                                        </div>

                                        <div className="booking-meta">
                                            <span><ClockIcon size={14} /> {appt.timeSlot}</span>
                                            <span>#{appt.id}</span>
                                        </div>

                                        {appt.reason && (
                                            <p className="booking-reason"><MessageIcon size={14} /> {appt.reason}</p>
                                        )}

                                        {appt.status === 'cancelled' && appt.cancelReason && (
                                            <p className="booking-reason" style={{ color: '#64748b' }}>Cancel reason: {appt.cancelReason}</p>
                                        )}

                                        {appt.status === 'rejected' && appt.cancelReason && (
                                            <p className="booking-reason" style={{ color: '#dc2626' }}>Doctor's note: {appt.cancelReason}</p>
                                        )}

                                        {appt.status === 'expired' && (
                                            <p className="booking-reason" style={{ color: '#92400e' }}>
                                                ⏰ The doctor did not respond before the appointment time. Please book a new appointment.
                                            </p>
                                        )}

                                        <div className="booking-footer-row">
                                            <span className="booked-on">Booked: {new Date(appt.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>

                                            <div className="appt-action-btns" style={{ display: 'flex', gap: '10px' }}>
                                                {appt.status === 'accepted' && (
                                                    <button
                                                        className="download-appt-btn"
                                                        onClick={() => handleDownloadSlip(appt)}
                                                        style={{ padding: '6px 12px', background: '#f8fafc', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        ⬇️ Download Slip
                                                    </button>
                                                )}
                                                {canCancel(appt) && (
                                                    <button
                                                        className="cancel-appt-btn"
                                                        onClick={() => openCancelModal(appt.id)}
                                                        disabled={cancellingId === appt.id}
                                                    >
                                                        {cancellingId === appt.id ? 'Cancelling...' : '✕ Cancel'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Inline Cancel Modal (replaces prompt()) ── */}
            {cancelModal.open && (
                <div className="modal-backdrop" onClick={() => setCancelModal({ open: false, id: null })}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '20px 24px 0' }}>
                            <div>
                                <h2 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}>Cancel Appointment</h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Please provide a reason for cancelling.</p>
                            </div>
                            <button className="modal-close" onClick={() => setCancelModal({ open: false, id: null })}>✕</button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                rows={3}
                                placeholder="e.g. Schedule conflict, feeling better, etc."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setCancelModal({ open: false, id: null })}
                                    style={{ padding: '9px 18px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleConfirmCancel}
                                    disabled={!cancelReason.trim()}
                                    style={{ padding: '9px 18px', borderRadius: 7, border: 'none', background: cancelReason.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}
                                >
                                    Confirm Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBookings;
