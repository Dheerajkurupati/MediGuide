import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getDoctors,
    getDoctorsBySpecialization,
    getAvailableSlots,
    bookAppointment,
    getCurrentUser
} from '../../utils/supabaseDatabase';
import './Doctors.css';
import { CrossIcon, SearchIcon, StethoscopeIcon, CalendarIcon, CheckCircleIcon, RefreshIcon, XCircleIcon, ClockIcon } from '../../components/Icons';

const SPEC_COLORS = {
    Cardiology: '#ef4444',
    Neurology: '#8b5cf6',
    Dermatology: '#f59e0b',
    Orthopedics: '#10b981',
    'General Medicine': '#3b82f6',
    Gastroenterology: '#f97316',
    Pediatrics: '#ec4899',
    ENT: '#06b6d4'
};

const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(dateStr + 'T00:00').getDay()];
};

const Doctors = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Doctor list state ──────────────────────────────────────
    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // ── Modal / booking state ─────────────────────────────────
    const [showModal, setShowModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [gender, setGender] = useState('');
    const [reason, setReason] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [bookingError, setBookingError] = useState('');

    // Date bounds
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
    })();

    // ── Load doctors ──────────────────────────────────────────
    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.isAdmin) { navigate('/login'); return; }

        // Pre-fill gender from profile
        if (user.gender) setGender(user.gender);

        const params = new URLSearchParams(location.search);
        const specParam = params.get('specialization');
        const searchParam = params.get('search');
        if (searchParam) setSearchQuery(searchParam);

        const loadDoctors = async () => {
            setLoadingDoctors(true);
            const data = specParam
                ? await getDoctorsBySpecialization(specParam)
                : await getDoctors();
            setDoctors(data);
            setLoadingDoctors(false);
        };
        loadDoctors();
    }, [navigate, location]);

    // ── Filtered list ─────────────────────────────────────────
    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.designation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Modal helpers ────────────────────────────────────────
    const openModal = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedDate('');
        setSlots([]);
        setSelectedSlot('');
        setReason('');
        setBookingError('');
        setBookingSuccess(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedDoctor(null);
        setBookingSuccess(null);
        setBookingError('');
    };

    // ── Date selection ────────────────────────────────────────
    const handleDateChange = async (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        setSelectedSlot('');
        setBookingError('');

        if (!date || !selectedDoctor) return;

        const dayName = getDayName(date);
        if (!selectedDoctor.availableDays.includes(dayName)) {
            setSlots([]);
            return;
        }

        setLoadingSlots(true);
        const available = await getAvailableSlots(selectedDoctor.id, date);
        setSlots(available);
        setLoadingSlots(false);
    };

    // ── Refresh slots ─────────────────────────────────────────
    const refreshSlots = async () => {
        if (!selectedDate || !selectedDoctor) return;
        setLoadingSlots(true);
        setSelectedSlot('');
        const available = await getAvailableSlots(selectedDoctor.id, selectedDate);
        setSlots(available);
        setLoadingSlots(false);
    };

    // ── Book appointment ──────────────────────────────────────
    const handleBooking = async () => {
        setBookingError('');
        if (!selectedDate || !selectedSlot) {
            setBookingError('Please select a date and time slot.');
            return;
        }
        if (!gender) {
            setBookingError('Please select your gender.');
            return;
        }
        if (!reason.trim()) {
            setBookingError('Please enter a reason for your visit.');
            return;
        }

        setBookingLoading(true);

        // Re-check availability just before booking (anti-double-booking)
        const freshSlots = await getAvailableSlots(selectedDoctor.id, selectedDate);
        const slotInfo = freshSlots.find(s => s.time === selectedSlot);
        if (!slotInfo?.available) {
            setSlots(freshSlots);
            setSelectedSlot('');
            setBookingLoading(false);
            setBookingError('Sorry, this slot was just taken. Please choose another time slot.');
            return;
        }

        const result = await bookAppointment({
            doctorId: selectedDoctor.id,
            doctorName: selectedDoctor.name,
            specialization: selectedDoctor.specialization,
            date: selectedDate,
            timeSlot: selectedSlot,
            reason: reason.trim(),
            gender: gender
        });

        setBookingLoading(false);

        if (result.success) {
            setBookingSuccess(result.appointment);
            // Refresh slots so the booked one shows as taken
            const updatedSlots = await getAvailableSlots(selectedDoctor.id, selectedDate);
            setSlots(updatedSlots);
        } else {
            if (result.message?.includes('duplicate') || result.message?.includes('unique')) {
                setBookingError('This slot was just booked by someone else. Please choose another.');
                const updatedSlots = await getAvailableSlots(selectedDoctor.id, selectedDate);
                setSlots(updatedSlots);
                setSelectedSlot('');
            } else {
                setBookingError(result.message || 'Booking failed. Please try again.');
            }
        }
    };

    // ── Helper: is this doctor available today? ───────────────
    const isDoctorAvailableToday = (doctor) => {
        const today = getDayName(todayStr);
        return doctor.availableDays.includes(today);
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="doctors-page">
            {/* ── Navbar ── */}
            <nav className="patient-nav">
                <div className="nav-inner">
                    <span className="nav-logo" onClick={() => navigate('/dashboard')}>
                        <CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />CityCare
                    </span>
                    <div className="nav-links">
                        <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <span className="active">Doctors</span>
                        <span onClick={() => navigate('/my-bookings')}>My Bookings</span>
                    </div>
                    <button className="logout-btn" onClick={() => { localStorage.removeItem('citycare_current_user'); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="doctors-container">
                {/* ── Header + Search ── */}
                <div className="doctors-header">
                    <h1>Our Specialists</h1>
                    <p>Book appointments with our qualified doctors — <strong>available across the week</strong></p>
                    <div className="search-wrap">
                        <span className="search-icon"><SearchIcon size={18} /></span>
                        <input
                            type="text"
                            placeholder="Search by name, specialization or designation..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
                        )}
                    </div>
                </div>

                {/* ── Loading skeleton ── */}
                {loadingDoctors ? (
                    <div className="doctors-grid">
                        {[...Array(8)].map((_, i) => (
                            <div className="doctor-card skeleton" key={i}>
                                <div className="skeleton-avatar" />
                                <div className="skeleton-line long" />
                                <div className="skeleton-line short" />
                                <div className="skeleton-line medium" />
                                <div className="skeleton-line medium" />
                            </div>
                        ))}
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="no-results">
                        <SearchIcon size={40} color="#94a3b8" />
                        <h3>{searchQuery ? `No results for "${searchQuery}"` : 'No doctors found'}</h3>
                        <p>Try a different search term or specialization.</p>
                        {searchQuery && <button onClick={() => setSearchQuery('')}>Clear Search</button>}
                    </div>
                ) : (
                    <>
                        <p className="results-count">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found</p>
                        <div className="doctors-grid">
                            {filteredDoctors.map(doctor => {
                                const color = SPEC_COLORS[doctor.specialization] || '#64748b';
                                const availableToday = isDoctorAvailableToday(doctor);
                                return (
                                    <div className="doctor-card" key={doctor.id}>
                                        <div className="doc-avatar" style={{ background: `${color}1a`, color }}>
                                            <StethoscopeIcon size={30} />
                                        </div>
                                        <h3>{doctor.name}</h3>
                                        <span className="spec-badge" style={{ background: `${color}15`, color }}>
                                            {doctor.specialization}
                                        </span>
                                        <p className="designation">{doctor.designation}</p>
                                        {/* Qualification and Fee removed */}

                                        {/* Available days chips */}
                                        <div className="available-days-row">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(short => {
                                                const full = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[short];
                                                const active = doctor.availableDays.includes(full);
                                                return (
                                                    <span key={short} className={`day-chip ${active ? 'day-on' : 'day-off'}`}>
                                                        {short}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        <div className={`today-badge ${availableToday ? 'available' : 'unavailable'}`}>
                                            {availableToday ? '✓ Available Today' : '✗ Not Available Today'}
                                        </div>

                                        <button className="book-btn" onClick={() => openModal(doctor)}>
                                            Book Appointment
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ── Booking Modal ── */}
            {showModal && selectedDoctor && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>✕</button>

                        {bookingSuccess ? (
                            /* ── Success Screen ── */
                            <div className="booking-success">
                                <div className="success-icon"><CheckCircleIcon size={56} color="#16a34a" /></div>
                                <h2>Appointment Confirmed!</h2>
                                <p className="success-sub">Your booking has been saved. See you soon!</p>
                                <div className="success-details">
                                    <div className="success-row"><span>Booking ID</span><strong>#{bookingSuccess.id}</strong></div>
                                    <div className="success-row"><span>Doctor</span><strong>{bookingSuccess.doctorName}</strong></div>
                                    <div className="success-row"><span>Specialization</span><strong>{bookingSuccess.specialization}</strong></div>
                                    <div className="success-row"><span>Date</span><strong>{getDayName(bookingSuccess.date)}, {bookingSuccess.date}</strong></div>
                                    <div className="success-row"><span>Time</span><strong>{bookingSuccess.timeSlot}</strong></div>
                                    <div className="success-row"><span>Gender</span><strong>{bookingSuccess.gender || '—'}</strong></div>
                                    <div className="success-row"><span>Reason</span><strong>{bookingSuccess.reason}</strong></div>
                                </div>
                                <div className="success-actions">
                                    <button className="btn-primary" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
                                    <button className="btn-outline" onClick={closeModal}>Book Another</button>
                                </div>
                            </div>
                        ) : (
                            /* ── Booking Form ── */
                            <>
                                {/* Modal Doctor Info Header */}
                                <div className="modal-header">
                                    <div className="modal-doc-info">
                                        <div className="modal-avatar" style={{ color: SPEC_COLORS[selectedDoctor.specialization] || '#64748b' }}>
                                            <StethoscopeIcon size={30} />
                                        </div>
                                        <div>
                                            <h2>{selectedDoctor.name}</h2>
                                            <span className="modal-spec" style={{ color: SPEC_COLORS[selectedDoctor.specialization] || '#64748b' }}>
                                                {selectedDoctor.specialization} · {selectedDoctor.designation}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Show actual available days in modal */}
                                    <div className="modal-available-days">
                                        <CalendarIcon size={13} />
                                        <span>Available: </span>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(short => {
                                            const full = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[short];
                                            const active = selectedDoctor.availableDays.includes(full);
                                            return (
                                                <span key={short} className={`day-chip sm ${active ? 'day-on' : 'day-off'}`}>{short}</span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="modal-body">
                                    {/* Error banner */}
                                    {bookingError && (
                                        <div className="booking-error-banner">
                                            <XCircleIcon size={16} /> {bookingError}
                                        </div>
                                    )}

                                    {/* Step 1: Date */}
                                    <div className="form-group">
                                        <label>Select Date</label>
                                        <input
                                            type="date"
                                            min={todayStr}
                                            max={maxDate}
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                        />
                                        {selectedDate && (
                                            selectedDoctor.availableDays.includes(getDayName(selectedDate))
                                                ? <p className="day-label available-day"><CalendarIcon size={13} /> {getDayName(selectedDate)} — Doctor is available</p>
                                                : <p className="day-label unavailable-day"><XCircleIcon size={13} /> {getDayName(selectedDate)} — Not available. Please choose another date.</p>
                                        )}
                                    </div>

                                    {/* Step 2: Time Slots */}
                                    {selectedDate && selectedDoctor.availableDays.includes(getDayName(selectedDate)) && (
                                        <div className="form-group">
                                            <div className="slot-label-row">
                                                <label>Select Time Slot</label>
                                                <button className="refresh-btn" onClick={refreshSlots} disabled={loadingSlots}>
                                                    <RefreshIcon size={13} /> {loadingSlots ? 'Loading...' : 'Refresh'}
                                                </button>
                                            </div>
                                            {loadingSlots ? (
                                                <div className="slots-loading">Loading available slots...</div>
                                            ) : slots.length === 0 ? (
                                                <p className="all-booked-msg">No slots available for this date.</p>
                                            ) : (
                                                <>
                                                    <div className="slots-grid">
                                                        {slots.map(slot => (
                                                            <button
                                                                key={slot.time}
                                                                className={`slot-btn ${slot.isPast ? 'past' : slot.isBooked ? 'booked' : selectedSlot === slot.time ? 'selected' : 'available'}`}
                                                                disabled={!slot.available}
                                                                onClick={() => { setSelectedSlot(slot.time); setBookingError(''); }}
                                                                title={slot.isPast ? 'Time passed' : slot.isBooked ? 'Already booked' : 'Available'}
                                                            >
                                                                <span className="slot-time"><ClockIcon size={12} /> {slot.time}</span>
                                                                <span className="slot-status">
                                                                    {slot.isPast ? 'Past' : slot.isBooked ? 'Full' : 'Open'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {slots.every(s => !s.available) && (
                                                        <p className="all-booked-msg">All slots are full for this date. Try another date.</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 3: Gender + Reason */}
                                    {selectedSlot && (
                                        <>
                                            <div className="form-group">
                                                <label>Gender</label>
                                                <select value={gender} onChange={e => setGender(e.target.value)}>
                                                    <option value="">Select gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Reason for Visit</label>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Briefly describe your symptoms or reason for visit..."
                                                    value={reason}
                                                    onChange={e => setReason(e.target.value)}
                                                    maxLength={300}
                                                />
                                                <span className="char-count">{reason.length}/300</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Confirm button */}
                                    {selectedSlot && (
                                        <button
                                            className="confirm-btn"
                                            onClick={handleBooking}
                                            disabled={bookingLoading || !reason.trim() || !gender}
                                        >
                                            {bookingLoading ? (
                                                <><span className="btn-spinner" /> Processing...</>
                                            ) : 'Confirm Booking'}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Doctors;
