// ─────────────────────────────────────────────────────────────
// database.js
// Simulates a SQL database using browser localStorage.
// In a real app this would be replaced by API calls to a backend server.
// ─────────────────────────────────────────────────────────────

import { seedDoctors, adminCredentials } from './seedData';

// Keys used to store each "table" in localStorage
const KEYS = {
    USERS: 'citycare_users',
    DOCTORS: 'citycare_doctors',
    APPOINTMENTS: 'citycare_appointments',
    CURRENT_USER: 'citycare_current_user',
    ADMIN: 'citycare_admin',
    BOOKING_COUNTER: 'citycare_booking_counter'   // tracks next booking number
};

// ── Booking ID helper ────────────────────────────────────────
// Returns a simple 4-digit booking number (1001, 1002, 1003 …)
const getNextBookingId = () => {
    const last = parseInt(localStorage.getItem(KEYS.BOOKING_COUNTER) || '1000');
    const next = last + 1;
    localStorage.setItem(KEYS.BOOKING_COUNTER, String(next));
    return String(next);   // e.g. "1001"
};

// ── Initialize the database ──────────────────────────────────
// Called once when the app first loads (in App.jsx).
// Seeds doctors and admin credentials if they don't exist yet.
export const initializeDatabase = () => {
    // Seed doctors — each doctor keeps their own availableDays from seedData
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(seedDoctors));

    // Only create users and appointments tables if they don't exist
    if (!localStorage.getItem(KEYS.USERS)) localStorage.setItem(KEYS.USERS, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.APPOINTMENTS)) localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.ADMIN)) localStorage.setItem(KEYS.ADMIN, JSON.stringify(adminCredentials));
};

// ════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════

// Register a new patient account
export const registerUser = (userData) => {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');

    // Check if email is already taken
    if (users.find(u => u.email === userData.email)) {
        return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
        id: `user_${Date.now()}`,   // unique ID based on timestamp
        ...userData,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return { success: true, user: newUser };
};

// Log in as a patient — checks email + password
export const loginUser = (email, password) => {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
        return { success: true, user };
    }
    return { success: false, message: 'Invalid email or password.' };
};

// Log in as admin — checks against the single admin credential
export const loginAdmin = (email, password) => {
    const admin = JSON.parse(localStorage.getItem(KEYS.ADMIN));
    if (admin.email === email && admin.password === password) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify({ ...admin, isAdmin: true, name: 'Admin' }));
        return { success: true };
    }
    return { success: false, message: 'Invalid admin credentials.' };
};

// Returns the currently logged-in user (or null if nobody is logged in)
export const getCurrentUser = () => {
    const u = localStorage.getItem(KEYS.CURRENT_USER);
    return u ? JSON.parse(u) : null;
};

// Clear the current session (logout)
export const logoutUser = () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
};

// Returns every registered patient — used by admin dashboard
export const getAllUsers = () => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');

// Update user profile details (name, phone, age, gender — NOT email)
export const updateUser = (userId, updates) => {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, message: 'User not found.' };

    // Only allow updating safe fields
    const allowed = ['name', 'phone', 'age', 'gender'];
    allowed.forEach(field => {
        if (updates[field] !== undefined) users[idx][field] = updates[field];
    });

    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    // Also update the current session so navbar etc. reflect changes
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(users[idx]));
    return { success: true, user: users[idx] };
};

// Change password — verifies old password first
export const changePassword = (userId, oldPassword, newPassword) => {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, message: 'User not found.' };

    if (users[idx].password !== oldPassword) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    users[idx].password = newPassword;
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(users[idx]));
    return { success: true, message: 'Password changed successfully.' };
};

// Delete account — removes user and all their appointments
export const deleteAccount = (userId) => {
    let users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Remove all appointments belonging to this user
    let appointments = JSON.parse(localStorage.getItem(KEYS.APPOINTMENTS) || '[]');
    appointments = appointments.filter(a => a.userId !== userId);
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));

    // Log them out
    localStorage.removeItem(KEYS.CURRENT_USER);
    return { success: true };
};

// ════════════════════════════════════════════════════════════
// DOCTOR MANAGEMENT
// ════════════════════════════════════════════════════════════

export const getDoctors = () => JSON.parse(localStorage.getItem(KEYS.DOCTORS) || '[]');
export const getDoctorById = (id) => getDoctors().find(d => d.id === id);

// Search by doctor name OR specialization (used in doctor page + admin)
export const searchDoctors = (query) => {
    const q = query.toLowerCase();
    return getDoctors().filter(d =>
        d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)
    );
};

// Get all doctors of a specific specialization (used when chatbot recommends)
export const getDoctorsBySpecialization = (spec) =>
    getDoctors().filter(d => d.specialization.toLowerCase() === spec.toLowerCase());

// ════════════════════════════════════════════════════════════
// SLOT AVAILABILITY
// ════════════════════════════════════════════════════════════

// Returns every time slot for a doctor on a given date,
// with flags: available, isBooked, isPast
export const getAvailableSlots = (doctorId, date) => {
    const doctor = getDoctorById(doctorId);
    if (!doctor) return [];

    const appointments = getAppointments();
    const now = new Date();

    // Build a local midnight Date for the chosen date to compare properly
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();

    // Slots already confirmed for this doctor on this date
    const confirmedSlots = appointments
        .filter(a => a.doctorId === doctorId && a.date === date && a.status === 'Confirmed')
        .map(a => a.timeSlot);

    return doctor.timeSlots.map(slot => {
        // Convert slot string "09:00 AM" into hours + minutes for comparison
        const [timePart, meridiem] = slot.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        // Build a Date object for this slot on the selected day
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);

        // A past slot is one that has already happened TODAY
        const isPast = isToday && slotTime <= now;
        const isBooked = confirmedSlots.includes(slot);

        return {
            time: slot,
            available: !isBooked && !isPast,
            isPast,
            isBooked
        };
    });
};

// ════════════════════════════════════════════════════════════
// APPOINTMENT MANAGEMENT
// ════════════════════════════════════════════════════════════

const getAppointments = () => JSON.parse(localStorage.getItem(KEYS.APPOINTMENTS) || '[]');

// All appointments for the logged-in patient (newest first)
export const getUserAppointments = (userId) =>
    getAppointments()
        .filter(a => a.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// All appointments across all patients (for admin view, newest first)
export const getAllAppointments = () =>
    getAppointments().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// Book a new appointment — always Confirmed (no waitlist in demo)
export const bookAppointment = (appointmentData) => {
    const appointments = getAppointments();
    const currentUser = getCurrentUser();

    const newAppointment = {
        id: getNextBookingId(),          // 4-digit number e.g. "1001"
        userId: currentUser.id,
        patientName: currentUser.name,
        patientEmail: currentUser.email,
        patientPhone: currentUser.phone || 'N/A',
        patientAge: appointmentData.patientAge || currentUser.age || 'N/A',
        ...appointmentData,
        status: 'Confirmed',                 // no waitlist — always confirmed
        createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    return { success: true, appointment: newAppointment };
};

// Cancel an appointment — requires a reason
// Changes status to Cancelled, stores the reason, does not delete the record
export const cancelAppointment = (appointmentId, cancelReason) => {
    const appointments = getAppointments();
    const idx = appointments.findIndex(a => a.id === appointmentId);
    if (idx === -1) return { success: false };

    appointments[idx].status = 'Cancelled';
    appointments[idx].cancelReason = cancelReason || 'No reason given';
    appointments[idx].cancelledAt = new Date().toISOString();

    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    return { success: true };
};

// Admin: update any appointment's status
// Enforces transition rules so invalid changes are blocked:
//   Cancelled → cannot go back to Confirmed or Completed
//   Completed → cannot go back to Confirmed
export const updateAppointmentStatus = (appointmentId, newStatus, reason) => {
    const appointments = getAppointments();
    const idx = appointments.findIndex(a => a.id === appointmentId);
    if (idx === -1) return { success: false, message: 'Appointment not found.' };

    const current = appointments[idx].status;

    // Only Confirmed appointments can change status
    // Completed = done, Cancelled = done — both are final states
    if (current === 'Cancelled') {
        return { success: false, message: 'Cancelled appointments cannot be modified.' };
    }
    if (current === 'Completed') {
        return { success: false, message: 'Completed appointments cannot be modified.' };
    }

    appointments[idx].status = newStatus;
    appointments[idx].updatedAt = new Date().toISOString();

    // If cancelling via admin, store the reason
    if (newStatus === 'Cancelled') {
        appointments[idx].cancelReason = reason || 'Cancelled by admin';
        appointments[idx].cancelledAt = new Date().toISOString();
    }

    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    return { success: true };
};
