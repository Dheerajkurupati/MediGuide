// ─────────────────────────────────────────────────────────────
// supabaseDatabase.js
// All data operations backed by Supabase.
// Session (logged-in user) is still stored in localStorage so
// the routing / auth guards work the same way as before.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

const SESSION_KEY = 'citycare_current_user';

// ─── Booking ID helper ────────────────────────────────────────
// Reads and increments the counter row in `booking_counter` table.
// Returns a string like "1001"
const getNextBookingId = async () => {
    // 'last' is the counter column name in Supabase
    const { data, error } = await supabase
        .from('booking_counter')
        .select('last')
        .eq('id', 1)
        .single();

    if (error || !data) {
        return String(Date.now()).slice(-6);
    }

    const next = (data.last || 1000) + 1;

    await supabase
        .from('booking_counter')
        .update({ last: next })
        .eq('id', 1);

    return String(next);
};

// ════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════

export const registerUser = async (userData) => {
    // Check if email already exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userData.email)
        .single();

    if (existing) {
        return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
        id: crypto.randomUUID(),
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone || null,
        age: userData.age ? parseInt(userData.age, 10) : null,   // int4 in Supabase
        gender: userData.gender || null,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').insert([newUser]);

    if (error) {
        return { success: false, message: error.message };
    }

    return { success: true, user: newUser };
};

export const loginUser = async (email, password) => {
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

    if (error || !user) {
        return { success: false, message: 'Invalid email or password.' };
    }

    // Normalise field names used throughout the app
    const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        createdAt: user.created_at
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
};

export const loginAdmin = async (email, password) => {
    const { data: admin, error } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

    if (error || !admin) {
        return { success: false, message: 'Invalid admin credentials.' };
    }

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ...admin, isAdmin: true, name: 'Admin' })
    );
    return { success: true };
};

// Gets the currently logged-in user from session (synchronous)
export const getCurrentUser = () => {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
};

// Clears the session
export const logoutUser = () => {
    localStorage.removeItem(SESSION_KEY);
};

// All registered patients (for admin view)
export const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        age: u.age,
        gender: u.gender,
        createdAt: u.created_at
    }));
};

// Update profile fields (name, phone, age, gender)
export const updateUser = async (userId, updates) => {
    const allowed = ['name', 'phone', 'age', 'gender'];
    const patch = {};
    allowed.forEach(f => { if (updates[f] !== undefined) patch[f] = updates[f]; });

    const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single();

    if (error || !data) {
        return { success: false, message: error?.message || 'Could not update profile.' };
    }

    const updatedUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        createdAt: data.created_at
    };

    // Refresh session
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
};

// Change password — verifies old password first
export const changePassword = async (userId, oldPassword, newPassword) => {
    // Verify old password
    const { data: user } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', userId)
        .single();

    if (!user) return { success: false, message: 'User not found.' };
    if (user.password !== oldPassword) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ password: newPassword })
        .eq('id', userId);

    if (error) return { success: false, message: error.message };

    // Update session
    const currentUser = getCurrentUser();
    if (currentUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...currentUser, password: newPassword }));
    }

    return { success: true, message: 'Password changed successfully.' };
};

// Delete account — removes user and all their appointments
export const deleteAccount = async (userId) => {
    // Delete appointments first (or rely on ON DELETE CASCADE if set up)
    await supabase.from('appointments').delete().eq('user_id', userId);

    const { error } = await supabase.from('profiles').delete().eq('id', userId);

    if (error) return { success: false, message: error.message };

    localStorage.removeItem(SESSION_KEY);
    return { success: true };
};

// ════════════════════════════════════════════════════════════
// DOCTOR MANAGEMENT
// ════════════════════════════════════════════════════════════

// Helper: normalise Supabase doctor row → app shape
const normaliseDoctor = (d) => ({
    id: d.id,
    name: d.name,
    specialization: d.specialization,
    designation: d.designation,
    availableDays: d.available_days,   // TEXT[] in Supabase
    timeSlots: d.time_slots             // TEXT[] in Supabase
});

export const getDoctors = async () => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

    if (error) return [];
    return data.map(normaliseDoctor);
};

export const getDoctorById = async (id) => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return normaliseDoctor(data);
};

export const searchDoctors = async (query) => {
    const q = query.toLowerCase();
    const { data, error } = await supabase
        .from('doctors')
        .select('*');

    if (error) return [];
    return data
        .map(normaliseDoctor)
        .filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.specialization.toLowerCase().includes(q)
        );
};

export const getDoctorsBySpecialization = async (spec) => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .ilike('specialization', spec);

    if (error) return [];
    return data.map(normaliseDoctor);
};

// ════════════════════════════════════════════════════════════
// SLOT AVAILABILITY
// ════════════════════════════════════════════════════════════

export const getAvailableSlots = async (doctorId, date) => {
    const doctor = await getDoctorById(doctorId);
    if (!doctor) return [];

    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();

    // Confirmed slots for this doctor on this date
    const { data: bookedData } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('status', 'Confirmed');

    const confirmedSlots = (bookedData || []).map(a => a.time_slot);

    return doctor.timeSlots.map(slot => {
        const [timePart, meridiem] = slot.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);

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

// Helper: normalise Supabase appointment row → app shape
// Note: appointments table has: patient_name, patient_phone, doctor_name,
// doctor_id, user_id, time_slot, cancel_reason, cancelled_at, updated_at
// It does NOT have patient_email, patient_age, patient_gender
const normaliseAppointment = (a) => ({
    id: a.id,
    userId: a.user_id,
    patientName: a.patient_name,
    patientPhone: a.patient_phone,
    doctorId: a.doctor_id,
    doctorName: a.doctor_name,
    specialization: a.specialization,
    date: a.date,
    timeSlot: a.time_slot,
    reason: a.reason,
    status: a.status,
    cancelReason: a.cancel_reason,
    cancelledAt: a.cancelled_at,
    updatedAt: a.updated_at,
    createdAt: a.created_at
});

// All appointments for a specific patient (newest first)
export const getUserAppointments = async (userId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(normaliseAppointment);
};

// All appointments — for admin (newest first)
export const getAllAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(normaliseAppointment);
};

// Book a new appointment
export const bookAppointment = async (appointmentData) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, message: 'Not logged in.' };

    const bookingId = await getNextBookingId();

    const newAppointment = {
        id: bookingId,
        user_id: currentUser.id,           // uuid — matches profiles.id
        patient_name: currentUser.name,
        patient_phone: currentUser.phone || 'N/A',
        doctor_id: appointmentData.doctorId,
        doctor_name: appointmentData.doctorName,
        specialization: appointmentData.specialization,
        date: appointmentData.date,
        time_slot: appointmentData.timeSlot,
        reason: appointmentData.reason,
        status: 'Confirmed',
        created_at: new Date().toISOString()
        // Note: patient_age, patient_email, patient_gender not in schema — excluded
    };

    const { data, error } = await supabase
        .from('appointments')
        .insert([newAppointment])
        .select()
        .single();

    if (error) return { success: false, message: error.message };

    return { success: true, appointment: normaliseAppointment(data) };
};

// Cancel an appointment — patient side
export const cancelAppointment = async (appointmentId, cancelReason) => {
    const { error } = await supabase
        .from('appointments')
        .update({
            status: 'Cancelled',
            cancel_reason: cancelReason || 'No reason given',
            cancelled_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

    if (error) return { success: false, message: error.message };
    return { success: true };
};

// Admin: change appointment status with transition rules
export const updateAppointmentStatus = async (appointmentId, newStatus, reason) => {
    // Fetch current status first
    const { data: appt } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentId)
        .single();

    if (!appt) return { success: false, message: 'Appointment not found.' };

    if (appt.status === 'Cancelled') {
        return { success: false, message: 'Cancelled appointments cannot be modified.' };
    }
    if (appt.status === 'Completed') {
        return { success: false, message: 'Completed appointments cannot be modified.' };
    }

    const patch = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    if (newStatus === 'Cancelled') {
        patch.cancel_reason = reason || 'Cancelled by admin';
        patch.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('appointments')
        .update(patch)
        .eq('id', appointmentId);

    if (error) return { success: false, message: error.message };
    return { success: true };
};
