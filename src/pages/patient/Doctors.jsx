import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getDoctors,
    getDoctorsBySpecialization,
    getAvailableSlots,
    bookAppointment,
    getCurrentUser
} from '../../utils/supabaseDatabase';
import './Doctors.css';
import { CrossIcon, SearchIcon, StethoscopeIcon, CalendarIcon, UserIcon, CheckCircleIcon, RefreshIcon, XCircleIcon, ClockIcon } from '../../components/Icons';

const Doctors = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [doctors, setDoctors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [reason, setReason] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(true);

    // Date bounds
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
    })();

    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.isAdmin) { navigate('/login'); return; }




        const params = new URLSearchParams(location.search);
        const specParam = params.get('specialization');

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

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openModal = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedDate('');
        setSlots([]);
        setSelectedSlot('');
        setReason('');
        setBookingSuccess(null);
        setShowModal(true);
    };

    const handleDateChange = async (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        setSelectedSlot('');
        if (date && selectedDoctor) {
            const dayName = getDayName(date);
            if (!selectedDoctor.availableDays.includes(dayName)) {
                setSlots([]);
            } else {
                const available = await getAvailableSlots(selectedDoctor.id, date);
                setSlots(available);
            }
        }
    };

    const refreshSlots = async () => {
        if (selectedDate && selectedDoctor) {
            const available = await getAvailableSlots(selectedDoctor.id, selectedDate);
            setSlots(available);
        }
    };

    const handleBooking = async () => {
        if (!selectedDate || !selectedSlot || !reason.trim()) {
            alert('Please select a date, time slot, and enter a reason for your visit.');
            return;
        }
        setLoading(true);
        // Double-check slot is still available
        const freshSlots = await getAvailableSlots(selectedDoctor.id, selectedDate);
        const slotInfo = freshSlots.find(s => s.time === selectedSlot);
        if (!slotInfo?.available) {
            alert('Sorry, this slot is no longer available. Please refresh and choose another.');
            setSlots(freshSlots);
            setSelectedSlot('');
            setLoading(false);
            return;
        }

        const result = await bookAppointment({
            doctorId: selectedDoctor.id,
            doctorName: selectedDoctor.name,
            specialization: selectedDoctor.specialization,
            date: selectedDate,
            timeSlot: selectedSlot,
            reason: reason.trim()
        });
        setLoading(false);
        if (result.success) {
            setBookingSuccess(result.appointment);
            const updatedSlots = await getAvailableSlots(selectedDoctor.id, selectedDate);
            setSlots(updatedSlots);
        } else {
            alert(result.message || 'Booking failed. Please try again.');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedDoctor(null);
        setBookingSuccess(null);
    };

    const getDayName = (dateStr) => {
        if (!dateStr) return '';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr + 'T00:00').getDay()];
    };

    const specColors = {
        Cardiology: '#ef4444', Neurology: '#8b5cf6', Dermatology: '#f59e0b',
        Orthopedics: '#10b981', 'General Medicine': '#3b82f6',
        Gastroenterology: '#f97316', Pediatrics: '#ec4899', ENT: '#06b6d4'
    };

    return (
        <div className="doctors-page">
            {/* ── Navbar ── */}
            <nav className="patient-nav">
                <div className="nav-inner">
                    <span className="nav-logo" onClick={() => navigate('/dashboard')}><CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />CityCare</span>
                    <div className="nav-links">
                        <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <span className="active" onClick={() => navigate('/doctors')}>Doctors</span>
                        <span onClick={() => navigate('/my-bookings')}>My Bookings</span>
                    </div>
                    <button className="logout-btn" onClick={() => { localStorage.removeItem('citycare_current_user'); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="doctors-container">
                <div className="doctors-header">
                    <h1>Our Specialists</h1>
                    <p>Available <strong>7 days a week</strong> — including Sundays</p>
                    <div className="search-wrap">
                        <span className="search-icon"><SearchIcon size={18} /></span>
                        <input
                            type="text"
                            placeholder="Search by doctor name or specialization..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="doctors-grid">
                    {filteredDoctors.map(doctor => (
                        <div className="doctor-card" key={doctor.id}>
                            <div className="doc-avatar" style={{ background: `${specColors[doctor.specialization]}22`, color: specColors[doctor.specialization] }}>
                                <StethoscopeIcon size={28} />
                            </div>
                            <h3>{doctor.name}</h3>
                            <span className="spec-badge" style={{ background: `${specColors[doctor.specialization]}18`, color: specColors[doctor.specialization] }}>
                                {doctor.specialization}
                            </span>
                            <p className="designation">{doctor.designation}</p>
                            <div className="availability-chip"><CalendarIcon size={14} /> {doctor.availableDays.map(d => d.slice(0, 3)).join(', ')}</div>
                            <button className="book-btn" onClick={() => openModal(doctor)}>
                                View Slots &amp; Book
                            </button>
                        </div>
                    ))}
                    {filteredDoctors.length === 0 && (
                        <div className="no-results">
                            <span><SearchIcon size={32} /></span>
                            <p>No doctors found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Booking Modal ── */}
            {showModal && selectedDoctor && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>✕</button>

                        {bookingSuccess ? (
                            <div className="booking-success">
                                <div className="success-icon"><CheckCircleIcon size={48} color="#16a34a" /></div>
                                <h2>Appointment Confirmed!</h2>
                                <div className="success-details">
                                    <p><strong>Booking ID:</strong> #{bookingSuccess.id}</p>
                                    <p><strong>Doctor:</strong> {bookingSuccess.doctorName}</p>
                                    <p><strong>Specialization:</strong> {bookingSuccess.specialization}</p>
                                    <p><strong>Date:</strong> {getDayName(bookingSuccess.date)}, {bookingSuccess.date}</p>
                                    <p><strong>Time:</strong> {bookingSuccess.timeSlot}</p>
                                    <p><strong>Reason:</strong> {bookingSuccess.reason}</p>
                                </div>
                                <div className="success-actions">
                                    <button className="btn-primary" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
                                    <button className="btn-outline" onClick={closeModal}>Book Another</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="modal-header">
                                    <div className="modal-doc-info">
                                        <div className="modal-avatar" style={{ color: specColors[selectedDoctor.specialization] }}><StethoscopeIcon size={28} /></div>
                                        <div>
                                            <h2>{selectedDoctor.name}</h2>
                                            <span className="modal-spec" style={{ color: specColors[selectedDoctor.specialization] }}>
                                                {selectedDoctor.specialization}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Select Date <span className="label-hint">(Available Mon–Sun)</span></label>
                                        <input
                                            type="date"
                                            min={todayStr}
                                            max={maxDate}
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                        />
                                        {selectedDate && (
                                            selectedDoctor.availableDays.includes(getDayName(selectedDate))
                                                ? <p className="day-label"><CalendarIcon size={14} /> {getDayName(selectedDate)} — Doctor is available</p>
                                                : <p className="day-label" style={{ color: '#ef4444' }}><XCircleIcon size={14} /> {getDayName(selectedDate)} — Doctor is not available. Try another date.</p>
                                        )}
                                    </div>

                                    {selectedDate && selectedDoctor.availableDays.includes(getDayName(selectedDate)) && (
                                        <div className="form-group">
                                            <div className="slot-label-row">
                                                <label>Select Time Slot</label>
                                                <button className="refresh-btn" onClick={refreshSlots}><RefreshIcon size={14} /> Refresh</button>
                                            </div>
                                            <div className="slots-grid">
                                                {slots.map(slot => (
                                                    <button
                                                        key={slot.time}
                                                        className={`slot-btn ${slot.isPast ? 'past' :
                                                            slot.isBooked ? 'booked' :
                                                                selectedSlot === slot.time ? 'selected' : 'available'
                                                            }`}
                                                        disabled={!slot.available}
                                                        onClick={() => setSelectedSlot(slot.time)}
                                                        title={slot.isPast ? 'This time has already passed' : slot.isBooked ? 'Slot fully booked' : 'Available'}
                                                    >
                                                        <span className="slot-time">{slot.time}</span>
                                                        <span className="slot-status">
                                                            {slot.isPast ? 'Past' : slot.isBooked ? 'Full' : 'Open'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {slots.every(s => !s.available) && (
                                                <p className="all-booked-msg">No available slots for this date. Please choose another date.</p>
                                            )}
                                        </div>
                                    )}

                                    {selectedSlot && (
                                        <>
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

                                    {selectedSlot && (
                                        <button
                                            className="confirm-btn"
                                            onClick={handleBooking}
                                            disabled={loading || !reason.trim()}
                                        >
                                            {loading ? 'Processing...' : 'Confirm Booking'}
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
