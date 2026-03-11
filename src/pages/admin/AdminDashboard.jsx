import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getDoctors,
    getAllUsers,
    getAllAppointments,
    updateAppointmentStatus,
    getCurrentUser
} from '../../utils/database';
import './AdminDashboard.css';

const TABS = ['Appointments', 'Doctors', 'Registered Users'];
const STATUS_OPTIONS = ['Confirmed', 'Completed', 'Cancelled'];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Appointments');
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [doctorDate, setDoctorDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user?.isAdmin) { navigate('/admin-login'); return; }
        loadData();
    }, [navigate]);

    const loadData = () => {
        setAppointments(getAllAppointments());
        setDoctors(getDoctors());
        setUsers(getAllUsers());
    };

    const handleStatusChange = (appointmentId, newStatus) => {
        // If cancelling, ask admin for a reason
        let reason = '';
        if (newStatus === 'Cancelled') {
            reason = prompt('Please enter a reason for cancellation:');
            if (!reason) return;   // admin clicked Cancel on the prompt — do nothing
        }

        const result = updateAppointmentStatus(appointmentId, newStatus, reason);

        if (!result.success) {
            alert(result.message);   // e.g. "Cannot change status of a cancelled appointment."
            return;
        }

        setAppointments(getAllAppointments());
    };

    const filteredAppointments = appointments.filter(a => {
        const matchesSearch =
            a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        const matchesDoctor = !selectedDoctor || a.doctorId === selectedDoctor.id;
        return matchesSearch && matchesStatus && matchesDoctor;
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
        Confirmed: { bg: '#f0fdf4', color: '#16a34a' },
        Waitlist: { bg: '#fffbeb', color: '#d97706' },
        Cancelled: { bg: '#fef2f2', color: '#dc2626' },
        Completed: { bg: '#f0f9ff', color: '#0284c7' }
    }[s] || { bg: '#f8fafc', color: '#64748b' });

    const stats = [
        { label: 'Total Appointments', value: appointments.length, icon: '📅', color: '#2563eb' },
        { label: 'Confirmed', value: appointments.filter(a => a.status === 'Confirmed').length, icon: '✅', color: '#16a34a' },
        { label: 'Completed', value: appointments.filter(a => a.status === 'Completed').length, icon: '✔️', color: '#0284c7' },
        { label: 'Registered Patients', value: users.length, icon: '👥', color: '#7c3aed' }
    ];

    return (
        <div className="admin-page">
            {/* ── Nav ── */}
            <nav className="admin-nav">
                <div className="admin-nav-inner">
                    <span className="admin-logo">🏥 CityCare Admin</span>
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
                            onClick={() => { setActiveTab(t); setSearchQuery(''); setSelectedDoctor(null); setStatusFilter('All'); }}
                        >
                            {t === 'Appointments' ? '📋' : t === 'Doctors' ? '👨‍⚕️' : '👥'} {t}
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
                        <div className="toolbar-right">
                            {selectedDoctor && (
                                <button className="clear-filter-btn" onClick={() => setSelectedDoctor(null)}>
                                    ✕ {selectedDoctor.name}
                                </button>
                            )}
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="All">All Status</option>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
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
                                                {a.status === 'Cancelled' && a.cancelReason && (
                                                    <p className="cancel-reason">📝 {a.cancelReason}</p>
                                                )}
                                            </td>
                                            <td>
                                                {a.status === 'Completed' || a.status === 'Cancelled' ? (
                                                    <span className="status-locked">🔒 Final</span>
                                                ) : (
                                                    <select
                                                        className="status-select"
                                                        value={a.status}
                                                        onChange={e => handleStatusChange(a.id, e.target.value)}
                                                    >
                                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                        <div className="doctor-date-picker">
                            <label>📅 Showing doctors available on:</label>
                            <input
                                type="date"
                                value={doctorDate}
                                onChange={e => setDoctorDate(e.target.value)}
                            />
                            <span className="day-tag">{selectedDayName}</span>
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
                                    const count = appointments.filter(a => a.doctorId === d.id && a.status !== 'Cancelled').length;
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
                                    <th>User ID</th>
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
                                    <tr><td colSpan={8} className="empty-row">No registered users found</td></tr>
                                ) : filteredUsers.map(u => {
                                    const userAppts = appointments.filter(a => a.userId === u.id);
                                    return (
                                        <tr key={u.id}>
                                            <td><code className="booking-id">{u.id}</code></td>
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
        </div>
    );
};

export default AdminDashboard;
