import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getDoctors,
    getAllUsers,
    getAllAppointments,
    updateAppointmentStatus,
    getCurrentUser,
    addDoctor,
    autoExpirePendingAppointments,
    deleteAppointment
} from '../../utils/supabaseDatabase';
import './AdminDashboard.css';
import { CrossIcon, ClipboardIcon, StethoscopeIcon, UsersIcon } from '../../components/Icons';

const TABS = ['Appointments', 'Doctors', 'Registered Users'];
const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Appointments');
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    // Local date helper (avoids UTC offset issues in IST)
    const localDateStr = (d = new Date()) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    };
    const [doctorDate, setDoctorDate] = useState(localDateStr());

    // Add Doctor Form State
    const [showAddDoctor, setShowAddDoctor] = useState(false);
    const [addingDoctor, setAddingDoctor] = useState(false);
    const [docForm, setDocForm] = useState({
        name: '', email: '', password: '',
        specialization: 'Cardiology', designation: ''
    });
    const INITIAL_DOC_FORM = {
        name: '', email: '', password: '',
        specialization: 'Cardiology', designation: ''
    };

    // Inline cancel/reject modal
    const [actionModal, setActionModal]   = useState({ open: false, id: null, newStatus: '' });
    const [actionReason, setActionReason] = useState('');

    // Delete state
    const [deletingId, setDeletingId] = useState(null);

    // In-page toast (replaces all alert())
    const [toast, setToast] = useState({ text: '', type: '' });
    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 3500);
    };

    useEffect(() => {
        const user = getCurrentUser();
        if (!user?.isAdmin) { navigate('/admin-login'); return; }
        // Expire stale pending appointments first, then load all data
        autoExpirePendingAppointments().then(() => loadData());
    }, [navigate]);

    const loadData = async () => {
        const [appts, docs, usrs] = await Promise.all([
            getAllAppointments(),
            getDoctors(),
            getAllUsers()
        ]);
        setAppointments(appts);
        setDoctors(docs);
        setUsers(usrs);
    };

    // Returns allowed next-state transitions for a given current status
    const getAllowedTransitions = (currentStatus) => {
        switch (currentStatus) {
            case 'pending': return ['pending', 'accepted', 'rejected', 'cancelled'];
            case 'accepted': return ['accepted', 'completed', 'cancelled'];
            default: return [currentStatus]; // rejected, completed, cancelled, expired → locked
        }
    };

    const handleStatusChange = async (appointmentId, newStatus, currentStatus) => {
        if (newStatus === currentStatus) return;
        // 'cancelled' and 'rejected' → open inline modal to collect a reason
        if (newStatus === 'cancelled' || newStatus === 'rejected') {
            setActionModal({ open: true, id: appointmentId, newStatus });
            setActionReason('');
            return;
        }
        const result = await updateAppointmentStatus(appointmentId, newStatus, '');
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
            showToast(`Appointment status updated to ${newStatus}`);
        }
    };

    const handleConfirmAction = async () => {
        if (!actionReason.trim()) return;
        const { id, newStatus } = actionModal;
        setActionModal({ open: false, id: null, newStatus: '' });
        const result = await updateAppointmentStatus(id, newStatus, actionReason.trim());
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, cancelReason: actionReason.trim() } : a));
            showToast(`Appointment ${newStatus} successfully!`);
        }
        setActionReason('');
    };

    const handleDeleteAppointment = async (appointmentId, currentStatus) => {
        if (deletingId === appointmentId) {
            // Second click = confirmed
            const result = await deleteAppointment(appointmentId, currentStatus);
            if (!result.success) { showToast(result.message, 'error'); }
            setDeletingId(null);
            const appts = await getAllAppointments();
            setAppointments(appts);
        } else {
            // First click = arm for confirmation
            setDeletingId(appointmentId);
            // Auto-disarm after 4 seconds
            setTimeout(() => setDeletingId(id => id === appointmentId ? null : id), 4000);
        }
    };

    const handleAddDoctorSubmit = async (e) => {
        e.preventDefault();
        setAddingDoctor(true);

        const result = await addDoctor({
            ...docForm,
            available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']
        });
        setAddingDoctor(false);

        if (result.success) {
            showToast(`✅ Doctor registered! ID: ${result.doctorId}`);
            setShowAddDoctor(false);
            setDocForm(INITIAL_DOC_FORM);
            setDoctors(await getDoctors());
        } else {
            showToast(`Error: ${result.message}`, 'error');
        }
    };

    const filteredAppointments = appointments.filter(a => {
        const matchesSearch =
            a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        const matchesDoctor = !selectedDoctor || a.doctorId === selectedDoctor.id;
        const matchesDate = !dateFilter || a.date === dateFilter;
        return matchesSearch && matchesStatus && matchesDoctor && matchesDate;
    });

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter doctors by selected date's day name
    const getDayNameFromDate = (dateStr) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr + 'T00:00').getDay()];
    };
    const selectedDayName = getDayNameFromDate(doctorDate);
    const doctorsOnDay = doctors.filter(d => d.availableDays?.includes(selectedDayName));
    const filteredDoctors = searchQuery
        ? doctorsOnDay.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
        : doctorsOnDay;

    const statusColor = (s) => ({
        pending: { bg: '#fffbeb', color: '#d97706' },
        accepted: { bg: '#f0fdf4', color: '#16a34a' },
        rejected: { bg: '#fef2f2', color: '#dc2626' },
        completed: { bg: '#f0f9ff', color: '#0284c7' },
        cancelled: { bg: '#f1f5f9', color: '#64748b' }
    }[s] || { bg: '#f8fafc', color: '#64748b' });

    const stats = [
        { label: 'Total Appointments', value: appointments.length, icon: '📅', color: '#2563eb' },
        { label: 'Accepted', value: appointments.filter(a => a.status === 'accepted').length, icon: '✅', color: '#16a34a' },
        { label: 'Pending', value: appointments.filter(a => a.status === 'pending').length, icon: '⏳', color: '#d97706' },
        { label: 'Expired (No Response)', value: appointments.filter(a => a.status === 'expired').length, icon: '⏰', color: '#b45309' },
        { label: 'Registered Patients', value: users.length, icon: '👥', color: '#7c3aed' }
    ];

    return (
        <div className="admin-page">
            {/* ── Nav ── */}
            <nav className="admin-nav">
                <div className="admin-nav-inner">
                    <span className="admin-logo"><CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> CityCare Admin</span>
                    <div className="admin-nav-right">
                        <span className="admin-badge">👤 Admin</span>
                        <button className="admin-logout" onClick={() => { localStorage.removeItem('citycare_current_user'); navigate('/'); }}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="admin-container">
                <h1 className="admin-title">Hospital Staff Dashboard</h1>

                {/* ── In-page Toast ── */}
                {toast.text && (
                    <div style={{
                        position: 'fixed', top: 24, right: 24, zIndex: 9999,
                        background: toast.type === 'error' ? '#dc2626' : '#16a34a',
                        color: '#fff', padding: '14px 22px', borderRadius: 12,
                        fontWeight: 600, fontSize: '0.95rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        animation: 'slideIn 0.3s ease'
                    }}>
                        {toast.type === 'error' ? '❌' : '✅'} {toast.text}
                    </div>
                )}

                {/* ── Stats Cards ── */}
                <div className="stats-row">
                    {stats.map(s => (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
                            <div>
                                <p className="stat-val" style={{ color: s.color }}>{s.value}</p>
                                <p className="stat-lbl">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="admin-tabs">
                    {TABS.map(t => (
                        <button
                            key={t}
                            className={`admin-tab ${activeTab === t ? 'active' : ''}`}
                            onClick={() => { setActiveTab(t); setSearchQuery(''); setSelectedDoctor(null); setStatusFilter('All'); setDateFilter(''); }}
                        >
                            {t === 'Appointments' ? <ClipboardIcon size={16} /> : t === 'Doctors' ? <StethoscopeIcon size={16} /> : <UsersIcon size={16} />} {t}
                        </button>
                    ))}
                </div>

                {/* ── Search + Filters ── */}
                <div className="table-toolbar">
                    <div className="search-box">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'Appointments' ? 'Search by patient, doctor, booking ID...' :
                                    activeTab === 'Doctors' ? 'Search by doctor or specialization...' :
                                        'Search by name or email...'
                            }
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {activeTab === 'Appointments' && (
                        <>
                            <div className="date-icon-btn" onClick={() => document.getElementById('appt-date-filter').showPicker()}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <input
                                    id="appt-date-filter"
                                    type="date"
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                    className="hidden-date-input"
                                />
                            </div>
                            {dateFilter && (
                                <button className="clear-filter-btn" onClick={() => setDateFilter('')}>
                                    ✕ {dateFilter}
                                </button>
                            )}
                            <div className="toolbar-right">
                                {selectedDoctor && (
                                    <button className="clear-filter-btn" onClick={() => setSelectedDoctor(null)}>
                                        ✕ {selectedDoctor.name}
                                    </button>
                                )}
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="All">All Status</option>
                                    {['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'expired'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* ──────────────────────────────────────
            TAB: Appointments Table
        ────────────────────────────────────── */}
                {activeTab === 'Appointments' && (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Patient</th>
                                    <th>Age / Gender / Phone</th>
                                    <th>Doctor</th>
                                    <th>Date &amp; Time</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAppointments.length === 0 ? (
                                    <tr><td colSpan={8} className="empty-row">No appointments found</td></tr>
                                ) : filteredAppointments.map(a => {
                                    const sc = statusColor(a.status);
                                    return (
                                        <tr key={a.id}>
                                            <td><code className="booking-id">#{a.id}</code></td>
                                            <td>
                                                <div className="patient-cell">
                                                    <strong>{a.patientName}</strong>
                                                    <span>{a.patientEmail}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="meta-cell">
                                                    <span>Age: {a.patientAge}</span>
                                                    <span>{a.patientGender || '—'}</span>
                                                    <span>📞 {a.patientPhone}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="doctor-cell">
                                                    <strong>{a.doctorName}</strong>
                                                    <span>{a.specialization}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="meta-cell">
                                                    <strong>{a.date}</strong>
                                                    <span>🕒 {a.timeSlot}</span>
                                                </div>
                                            </td>
                                            <td className="reason-cell">{a.reason || '—'}</td>
                                            <td>
                                                <span className="tbl-badge" style={{ background: sc.bg, color: sc.color }}>
                                                    {a.status}
                                                </span>
                                                {(a.status === 'cancelled' || a.status === 'rejected') && a.cancelReason && (
                                                    <p className="cancel-reason">📝 {a.cancelReason}</p>
                                                )}
                                            </td>
                                            <td>
                                                {['completed', 'cancelled', 'rejected', 'expired'].includes(a.status) ? (
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span className="status-locked">🔒 Final</span>
                                                        <button
                                                            onClick={() => handleDeleteAppointment(a.id, a.status)}
                                                            title={deletingId === a.id ? 'Click again to confirm delete' : 'Delete this appointment'}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 6,
                                                                border: 'none',
                                                                background: deletingId === a.id ? '#dc2626' : '#fee2e2',
                                                                color: deletingId === a.id ? '#fff' : '#dc2626',
                                                                cursor: 'pointer',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {deletingId === a.id ? '⚠️ Confirm?' : '🗑️ Delete'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="status-select"
                                                        value={a.status}
                                                        onChange={e => handleStatusChange(a.id, e.target.value, a.status)}
                                                    >
                                                        {getAllowedTransitions(a.status).map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="row-count">{filteredAppointments.length} record{filteredAppointments.length !== 1 ? 's' : ''}</p>
                    </div>
                )}

                {/* ──────────────────────────────────────
            TAB: Doctors Table
        ────────────────────────────────────── */}
                {activeTab === 'Doctors' && (
                    <div className="table-wrap">
                        <div className="doctor-date-picker" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <label>📅 Showing doctors available on: </label>
                                <input
                                    type="date"
                                    value={doctorDate}
                                    onChange={e => setDoctorDate(e.target.value)}
                                    style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                />
                                <span className="day-tag" style={{ marginLeft: 8, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontSize: '0.85rem' }}>{selectedDayName}</span>
                            </div>
                            <button
                                className="action-btn"
                                style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => setShowAddDoctor(true)}
                            >
                                + Add New Doctor
                            </button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Doctor ID</th>
                                    <th>Name</th>
                                    <th>Specialization</th>
                                    <th>Designation</th>
                                    <th>Time Slots</th>
                                    <th>Appointments</th>
                                    <th>View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDoctors.length === 0 ? (
                                    <tr><td colSpan={7} className="empty-row">No doctors available on {selectedDayName}</td></tr>
                                ) : filteredDoctors.map(d => {
                                    const count = appointments.filter(a => a.doctorId === d.id && a.status !== 'cancelled' && a.status !== 'rejected').length;
                                    return (
                                        <tr key={d.id}>
                                            <td><code className="booking-id">{d.id}</code></td>
                                            <td><strong>{d.name}</strong></td>
                                            <td><span className="spec-tag">{d.specialization}</span></td>
                                            <td>{d.designation}</td>
                                            <td>{d.timeSlots?.length || 0} slots/day</td>
                                            <td>
                                                <span className="appt-count" style={{ color: count > 0 ? '#2563eb' : '#94a3b8' }}>
                                                    {count}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="view-btn"
                                                    onClick={() => { setSelectedDoctor(d); setActiveTab('Appointments'); }}
                                                >
                                                    View Appointments
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="row-count">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} available on {selectedDayName}</p>
                    </div>
                )}

                {/* ──────────────────────────────────────
            TAB: Registered Users Table
        ────────────────────────────────────── */}
                {activeTab === 'Registered Users' && (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Age</th>
                                    <th>Registered On</th>
                                    <th>Appointments</th>
                                    <th>View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan={7} className="empty-row">No registered users found</td></tr>
                                ) : filteredUsers.map(u => {
                                    const userAppts = appointments.filter(a => a.userId === u.id);
                                    return (
                                        <tr key={u.id}>
                                            <td><strong>{u.name}</strong></td>
                                            <td>{u.email}</td>
                                            <td>{u.phone || '—'}</td>
                                            <td>{u.age || '—'}</td>
                                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                            <td>
                                                <span className="appt-count" style={{ color: userAppts.length > 0 ? '#2563eb' : '#94a3b8' }}>
                                                    {userAppts.length}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="view-btn"
                                                    onClick={() => {
                                                        setSearchQuery(u.name);
                                                        setActiveTab('Appointments');
                                                    }}
                                                >
                                                    View Bookings
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="row-count">{filteredUsers.length} patient{filteredUsers.length !== 1 ? 's' : ''} registered</p>
                    </div>
                )}
            </div>

            {/* ── Add Doctor Modal ── */}
            {showAddDoctor && (
                <div className="modal-backdrop" onClick={() => setShowAddDoctor(false)}>
                    <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Register New Doctor</h2>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>This will automatically generate their Doctor ID and create their login app credentials.</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowAddDoctor(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleAddDoctorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Full Name</label>
                                    <input type="text" required placeholder="John Doe" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email Address</label>
                                    <input type="email" required placeholder="dr.john@citycare.com" value={docForm.email} onChange={e => setDocForm({ ...docForm, email: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Password</label>
                                    <input type="password" required minLength={6} placeholder="Secure password" value={docForm.password} onChange={e => setDocForm({ ...docForm, password: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Specialization</label>
                                        <select required value={docForm.specialization} onChange={e => setDocForm({ ...docForm, specialization: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
                                            <option value="Cardiology">Cardiology</option>
                                            <option value="Neurology">Neurology</option>
                                            <option value="Dermatology">Dermatology</option>
                                            <option value="Orthopedics">Orthopedics</option>
                                            <option value="General Medicine">General Medicine</option>
                                            <option value="Gastroenterology">Gastroenterology</option>
                                            <option value="Pediatrics">Pediatrics</option>
                                            <option value="ENT">ENT</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Designation</label>
                                        <input type="text" required placeholder="e.g. Senior Consultant" value={docForm.designation} onChange={e => setDocForm({ ...docForm, designation: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                </div>

                                {/* Qualification and Fee removed for simplicity */}

                                <button
                                    type="submit"
                                    disabled={addingDoctor}
                                    style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, marginTop: '1rem', cursor: addingDoctor ? 'not-allowed' : 'pointer', opacity: addingDoctor ? 0.7 : 1 }}
                                >
                                    {addingDoctor ? 'Registering Doctor...' : 'Register Doctor'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Inline Admin Cancel / Reject Modal ── */}
            {actionModal.open && (
                <div className="modal-backdrop" onClick={() => setActionModal({ open: false, id: null, newStatus: '' })}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '20px 24px 0' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>
                                    {actionModal.newStatus === 'rejected' ? 'Reject Appointment' : 'Cancel Appointment'}
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                                    {actionModal.newStatus === 'rejected'
                                        ? 'Provide a reason — this will be shown to the patient as a Doctor\'s Note.'
                                        : 'Enter a reason — this will be recorded and visible to the patient.'}
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setActionModal({ open: false, id: null, newStatus: '' })}>✕</button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                rows={3}
                                autoFocus
                                placeholder={
                                    actionModal.newStatus === 'rejected'
                                        ? 'e.g. Doctor is unavailable on this date, please rebook...'
                                        : 'e.g. Doctor unavailable, emergency closure...'
                                }
                                value={actionReason}
                                onChange={e => setActionReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                                <button onClick={() => setActionModal({ open: false, id: null, newStatus: '' })}
                                    style={{ padding: '9px 18px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>
                                    Go Back
                                </button>
                                <button onClick={handleConfirmAction} disabled={!actionReason.trim()}
                                    style={{ padding: '9px 18px', border: 'none', borderRadius: 7, background: actionReason.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: actionReason.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                                    {actionModal.newStatus === 'rejected' ? 'Confirm Reject' : 'Confirm Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
