// ─────────────────────────────────────────────────────────────
// supabaseDatabase.js  —  All data operations backed by Supabase
//
// Tables used:
//   sign_in       → patient profiles (id, name, email, phone, age)
//   login         → credentials (id=sign_in.id, email, password_hash)
//   reset_password → OTP for forgot-password (email, otp, expires_at)
//   doctors       → doctor data + login (email + password hashed in same row)
//   appointments  → bookings (status: pending→accepted/rejected→completed)
//   admin_credentials → admin login (email, password hashed)
//   booking_counter → generates BOOK1001, BOOK1002...
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { isOnline, isNetworkError, getErrorMessage } from './networkHelper';

const SESSION_KEY = 'citycare_current_user';
const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── IST Timestamp Helper ────────────────────────────────────
// Returns the current time as an ISO string offset to IST (+05:30).
// This ensures all timestamps saved in Supabase display as Indian Standard Time.
const getISTTimestamp = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
    const ist = new Date(now.getTime() + istOffset);
    return ist.toISOString().replace('Z', '+05:30');
};

// Helper to format a stored timestamp for display in IST
export const formatIST = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

// ════════════════════════════════════════════════════════════
// SESSION HELPERS
// ════════════════════════════════════════════════════════════

export const getCurrentUser = () => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw);
        // If session is older than 7 days, clear and force re-login
        if (user.loginTime && (Date.now() - user.loginTime) > SESSION_TTL_MS) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return user;
    } catch {
        // Corrupted data in localStorage → clear it
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
};

export const logoutUser = () => {
    localStorage.removeItem(SESSION_KEY);
};

// ════════════════════════════════════════════════════════════
// BOOKING REFERENCE GENERATOR  →  BOOK1001, BOOK1002 ...
// ════════════════════════════════════════════════════════════

const getBookingRef = async () => {
    try {
        const { data, error } = await supabase
            .from('booking_counter')
            .select('last')
            .eq('id', 1)
            .single();

        if (error || !data) throw new Error('counter unavailable');

        const next = (data.last || 1000) + 1;
        await supabase.from('booking_counter').update({ last: next }).eq('id', 1);
        return `BOOK${next}`;
    } catch {
        return `BOOK${String(Date.now()).slice(-6)}`;
    }
};

// ════════════════════════════════════════════════════════════
// PATIENT AUTH
// ════════════════════════════════════════════════════════════

/**
 * Register a new patient.
 * Inserts into sign_in (profile) and login (credentials) using shared UUID.
 */
export const registerUser = async (userData) => {
    // 1. Check email not already taken in login table
    const { data: existing } = await supabase
        .from('login')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle();

    if (existing) {
        return { success: false, message: 'An account with this email already exists.' };
    }

    // 2. Generate one shared UUID for both tables
    const sharedId = crypto.randomUUID();

    // 3. Hash password
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // 4. Insert profile into sign_in
    const { error: profileError } = await supabase.from('sign_in').insert([{
        id: sharedId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        age: userData.age ? parseInt(userData.age, 10) : null,
        gender: userData.gender || null,
        created_at: getISTTimestamp()
    }]);

    if (profileError) {
        return { success: false, message: profileError.message };
    }

    // 5. Insert credentials into login (same id as sign_in)
    const { error: loginError } = await supabase.from('login').insert([{
        id: sharedId,
        email: userData.email,
        password: passwordHash,
        created_at: getISTTimestamp()
    }]);

    if (loginError) {
        // Rollback sign_in insert
        await supabase.from('sign_in').delete().eq('id', sharedId);
        return { success: false, message: loginError.message };
    }

    return { success: true };
};

/**
 * Login a patient.
 * Looks up login table → verifies bcrypt hash → loads sign_in profile.
 */
export const loginUser = async (email, password) => {
    // 1. Get credentials from login table
    const { data: loginRow, error: loginError } = await supabase
        .from('login')
        .select('id, password')
        .eq('email', email)
        .maybeSingle();

    if (loginError || !loginRow) {
        return { success: false, message: 'Invalid email or password.' };
    }

    // 2. Verify password hash
    const passwordMatch = await bcrypt.compare(password, loginRow.password);
    if (!passwordMatch) {
        return { success: false, message: 'Invalid email or password.' };
    }

    // 3. Load profile from sign_in
    const { data: profile, error: profileError } = await supabase
        .from('sign_in')
        .select('*')
        .eq('id', loginRow.id)
        .single();

    if (profileError || !profile) {
        return { success: false, message: 'Profile not found. Please contact support.' };
    }

    // 4. Update last_login (stored in IST)
    await supabase
        .from('sign_in')
        .update({ last_login: getISTTimestamp() })
        .eq('id', loginRow.id);

    // 5. Store session with timestamp
    const sessionUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        age: profile.age,
        gender: profile.gender || '',
        role: 'patient',
        createdAt: profile.created_at,
        loginTime: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
};

// ════════════════════════════════════════════════════════════
// ADMIN AUTH
// ════════════════════════════════════════════════════════════

export const loginAdmin = async (email, password) => {
    const { data: admin, error } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error || !admin) {
        return { success: false, message: 'Invalid admin credentials.' };
    }

    // Support both hashed and plain passwords (for migration)
    let passwordMatch = false;
    if (admin.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, admin.password);
    } else {
        passwordMatch = (password === admin.password); // plain text fallback
    }

    if (!passwordMatch) {
        return { success: false, message: 'Invalid admin credentials.' };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: admin.id,
        name: 'Admin',
        email: admin.email,
        role: 'admin',
        isAdmin: true,
        loginTime: Date.now()
    }));

    return { success: true };
};

// ════════════════════════════════════════════════════════════
// DOCTOR AUTH
// ════════════════════════════════════════════════════════════

/**
 * Doctor login: email + password only (no Doctor ID needed).
 */
export const loginDoctor = async (email, password) => {
    const { data: doctor, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Doctor login DB error:', error);
        return { success: false, message: 'Database error. Please try again.' };
    }

    if (!doctor) {
        return { success: false, message: 'No doctor account found with this email.' };
    }

    if (!doctor.password) {
        return { success: false, message: 'Password not set for this account. Please ask admin to reset.' };
    }

    // Support both bcrypt-hashed and plain-text passwords (for seed data)
    let passwordMatch = false;
    if (doctor.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, doctor.password);
    } else {
        passwordMatch = (password === doctor.password); // plain-text fallback
    }

    if (!passwordMatch) {
        return { success: false, message: 'Incorrect password.' };
    }

    const sessionDoctor = {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        designation: doctor.designation,
        availableDays: doctor.available_days || [],
        timeSlots: doctor.time_slots || [],
        role: 'doctor',
        isDoctor: true,
        loginTime: Date.now()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionDoctor));
    return { success: true, doctor: sessionDoctor };
};

// ════════════════════════════════════════════════════════════
// PASSWORD RESET (OTP via reset_password table)
// ════════════════════════════════════════════════════════════

/**
 * Send OTP — calls Flask backend which generates OTP,
 * saves to reset_password table, and emails it to the patient.
 * OTP is never returned to the UI.
 */
export const sendOTP = async (email) => {
    if (!isOnline()) {
        return { success: false, message: 'No internet connection. Please check your network and try again.' };
    }
    try {
        const res = await fetch('http://localhost:5050/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        return data; // { success, message }
    } catch (err) {
        return { success: false, message: getErrorMessage(err, 'Could not reach the email server. Make sure the backend is running.') };
    }
};

/**
 * Verify OTP entered by user.
 */
export const verifyOTP = async (email, enteredOtp) => {
    const { data: record, error } = await supabase
        .from('reset_password')
        .select('*')
        .eq('email', email)
        .eq('otp', enteredOtp)
        .maybeSingle();

    if (error || !record) {
        return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    if (new Date(record.expires_at) < new Date()) {
        return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    return { success: true };
};

/**
 * Set new password after OTP verified.
 */
export const resetPassword = async (email, newPassword) => {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const { error } = await supabase
        .from('login')
        .update({ password: passwordHash })
        .eq('email', email);

    if (error) {
        return { success: false, message: 'Failed to update password. Try again.' };
    }

    // Clean up OTP record
    await supabase.from('reset_password').delete().eq('email', email);

    return { success: true };
};

// ════════════════════════════════════════════════════════════
// USER / PROFILE MANAGEMENT (sign_in table)
// ════════════════════════════════════════════════════════════

export const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('sign_in')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        age: u.age,
        createdAt: u.created_at,
        lastLogin: u.last_login
    }));
};

export const updateUser = async (userId, updates) => {
    const allowed = ['name', 'phone', 'age', 'gender'];  // gender is now saved
    const patch = {};
    allowed.forEach(f => { if (updates[f] !== undefined) patch[f] = updates[f]; });

    const { data, error } = await supabase
        .from('sign_in')
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
        phone: data.phone,
        age: data.age,
        gender: data.gender || '',
        role: 'patient',
        createdAt: data.created_at
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
};

export const changePassword = async (userId, oldPassword, newPassword) => {
    // Get email to look up in login table
    const { data: profile } = await supabase
        .from('sign_in')
        .select('email')
        .eq('id', userId)
        .single();

    if (!profile) return { success: false, message: 'User not found.' };

    // Get current hash from login
    const { data: loginRow } = await supabase
        .from('login')
        .select('password')
        .eq('id', userId)
        .single();

    if (!loginRow) return { success: false, message: 'Login record not found.' };

    const match = await bcrypt.compare(oldPassword, loginRow.password);
    if (!match) return { success: false, message: 'Current password is incorrect.' };

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { error } = await supabase
        .from('login')
        .update({ password: newHash })
        .eq('id', userId);

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password changed successfully.' };
};

export const deleteAccount = async (userId) => {
    await supabase.from('appointments').delete().eq('user_id', userId);
    await supabase.from('login').delete().eq('id', userId);
    const { error } = await supabase.from('sign_in').delete().eq('id', userId);

    if (error) return { success: false, message: error.message };
    localStorage.removeItem(SESSION_KEY);
    return { success: true };
};

// ════════════════════════════════════════════════════════════
// DOCTOR MANAGEMENT
// ════════════════════════════════════════════════════════════

const normaliseDoctor = (d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    specialization: d.specialization,
    designation: d.designation,
    availableDays: d.available_days || [],
    timeSlots: d.time_slots || [],
    isActive: d.is_active ?? true
});

export const getDoctors = async () => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

    if (error) {
        console.error("Fetch doctors error:", error);
        return [];
    }
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

export const getDoctorsBySpecialization = async (spec) => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .ilike('specialization', spec);

    if (error) {
        console.error("Fetch doctors by spec error:", error);
        return [];
    }
    return data.map(normaliseDoctor);
};

/**
 * Admin: Add a new doctor. Hashes the password and stores in doctors table.
 */
export const addDoctor = async (doctorData) => {
    try {
        const { name, email, password, specialization, designation, available_days, time_slots } = doctorData;

        // 1. Auto-generate a unique Doctor ID like CARD002
        const prefix = specialization.substring(0, 4).toUpperCase();
        const { data: existingDocs } = await supabase
            .from('doctors')
            .select('id')
            .like('id', `${prefix}%`);

        const count = (existingDocs ? existingDocs.length : 0) + 1;
        const doctorId = `${prefix}${String(count).padStart(3, '0')}`;

        // 2. Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // 3. Insert doctor row
        const { error: docError } = await supabase.from('doctors').insert([{
            id: doctorId,
            name: name.startsWith('Dr. ') ? name : `Dr. ${name}`,
            email,
            password: passwordHash,
            specialization,
            designation,
            available_days: available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            time_slots: time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
            is_active: true,
            created_at: getISTTimestamp()
        }]);

        if (docError) throw docError;

        return { success: true, doctorId };
    } catch (err) {
        console.error('addDoctor error:', err);
        return { success: false, message: err.message || 'Failed to add doctor.' };
    }
};

/**
 * Admin/Doctor: Update doctor's available days + time slots.
 */
export const updateDoctorSchedule = async (doctorId, availableDays, timeSlots) => {
    const { error } = await supabase
        .from('doctors')
        .update({ available_days: availableDays, time_slots: timeSlots })
        .eq('id', doctorId);

    if (error) return { success: false, message: error.message };

    // Update session if it's the doctor updating their own schedule
    const current = getCurrentUser();
    if (current?.isDoctor && current.id === doctorId) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...current,
            availableDays,
            timeSlots
        }));
    }
    return { success: true };
};

export const toggleDoctorActive = async (doctorId, isActive) => {
    const { error } = await supabase
        .from('doctors')
        .update({ is_active: isActive })
        .eq('id', doctorId);

    if (error) return { success: false, message: error.message };
    return { success: true };
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

    // Try the SECURITY DEFINER RPC first (bypasses RLS so all users see booked slots).
    // If RPC fails (e.g. schema not reloaded), fall back to direct query.
    let bookedData = null;
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_booked_slots', { p_doctor_id: doctorId, p_date: date });

    if (rpcError) {
        console.warn('[slots] RPC failed, using direct query (may miss other users slots):', rpcError.message);
        const { data: fallbackData } = await supabase
            .from('appointments')
            .select('time_slot, status')
            .eq('doctor_id', doctorId)
            .eq('date', date)
            .in('status', ['pending', 'accepted', 'completed', 'rejected']);
        bookedData = fallbackData;
    } else {
        bookedData = rpcData;
    }

    const nowRef = new Date();
    const blockedSlots = (bookedData || []).filter(a => {
        // Block if accepted, completed, or rejected (if doctor rejected it, they are unavailable)
        if (a.status === 'accepted' || a.status === 'completed' || a.status === 'rejected') return true; 
        // For PENDING: only block if slot time is still in the future
        const [timePart, meridiem] = (a.time_slot || '').split(' ');
        if (!timePart || !meridiem) return true;
        let [h, m] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && h !== 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        const slotDT = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        return slotDT > nowRef;
    }).map(a => a.time_slot);

    return doctor.timeSlots.map(slot => {
        const [timePart, meridiem] = slot.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);

        const isPast = isToday && slotTime <= now;
        const isBooked = blockedSlots.includes(slot);

        return {
            time: slot,
            available: !isBooked && !isPast,
            isPast,
            isBooked
        };
    });
};

// ════════════════════════════════════════════════════════════
// AUTO-EXPIRE PENDING APPOINTMENTS WHOSE TIME HAS PASSED
// ════════════════════════════════════════════════════════════

/**
 * Marks any pending appointment whose date+time has already passed as 'expired'.
 * Call this when Doctor Dashboard or Admin Dashboard loads.
 * This frees up the blocked slots for re-booking.
 */
export const autoExpirePendingAppointments = async () => {
    try {
        const now = new Date();
        // Build date string from local time (not UTC) to avoid IST offset issues
        const localDD = String(now.getDate()).padStart(2, '0');
        const localMM = String(now.getMonth() + 1).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${localMM}-${localDD}`;

        // Fetch all pending appointments for today or earlier dates
        const { data: pending } = await supabase
            .from('appointments')
            .select('id, date, time_slot')
            .eq('status', 'pending')
            .lte('date', todayStr);

        if (!pending || pending.length === 0) return { expired: 0 };

        const toExpire = [];

        for (const appt of pending) {
            const [timePart, meridiem] = (appt.time_slot || '').split(' ');
            if (!timePart || !meridiem) continue;
            let [h, m] = timePart.split(':').map(Number);
            if (meridiem === 'PM' && h !== 12) h += 12;
            if (meridiem === 'AM' && h === 12) h = 0;
            const slotDT = new Date(`${appt.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
            if (slotDT <= now) {
                toExpire.push(appt.id);
            }
        }

        if (toExpire.length > 0) {
            await supabase
                .from('appointments')
                .update({
                    status: 'expired',
                    updated_at: getISTTimestamp(),
                    cancel_reason: 'Appointment time passed without a doctor response.'
                })
                .in('id', toExpire);
        }

        return { expired: toExpire.length };
    } catch (err) {
        console.error('[autoExpire] Error:', err);
        return { expired: 0 };
    }
};

// ════════════════════════════════════════════════════════════
// APPOINTMENTS
// ════════════════════════════════════════════════════════════

const normaliseAppointment = (a) => ({
    id: a.id,
    userId: a.user_id,
    patientName: a.patient_name,
    patientPhone: a.patient_phone,
    patientEmail: a.patient_email || '',       // ← now saved at booking time
    patientAge: a.patient_age || null,          // ← now saved at booking time
    patientGender: a.patient_gender || '',      // ← now saved at booking time
    doctorId: a.doctor_id,
    doctorName: a.doctor_name,
    specialization: a.specialization,
    date: a.date,
    timeSlot: a.time_slot,
    reason: a.reason,
    status: a.status,   // pending | accepted | rejected | completed | cancelled | expired
    cancelReason: a.cancel_reason,
    cancelledAt: a.cancelled_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at
});

export const getUserAppointments = async (userId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(normaliseAppointment);
};

export const getAllAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(normaliseAppointment);
};

/**
 * Doctor: get all appointments assigned to them.
 */
export const getDoctorAppointments = async (doctorId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('date', { ascending: true });

    if (error) return [];
    return data.map(normaliseAppointment);
};

export const bookAppointment = async (appointmentData) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, message: 'Not logged in.' };

    const bookingRef = await getBookingRef();

    const newAppointment = {
        id: bookingRef,                               // BOOK1001
        user_id: currentUser.id,
        patient_name: currentUser.name,
        patient_phone: currentUser.phone || 'N/A',
        patient_email: currentUser.email || '',        // ← saved for admin visibility
        patient_age: currentUser.age || null,          // ← saved for admin visibility
        patient_gender: appointmentData.gender || '', // ← saved for admin visibility
        doctor_id: appointmentData.doctorId,
        doctor_name: appointmentData.doctorName,
        specialization: appointmentData.specialization,
        date: appointmentData.date,
        time_slot: appointmentData.timeSlot,
        reason: appointmentData.reason,
        status: 'pending',                            // starts as pending — doctor must accept
        created_at: getISTTimestamp()                 // ← IST timestamp
    };

    const { data, error } = await supabase
        .from('appointments')
        .insert([newAppointment])
        .select()
        .single();

    if (error) return { success: false, message: error.message };

    return { success: true, appointment: normaliseAppointment(data) };
};

/**
 * Patient cancels their appointment.
 */
export const cancelAppointment = async (appointmentId, cancelReason) => {
    const { error } = await supabase
        .from('appointments')
        .update({
            status: 'cancelled',
            cancel_reason: cancelReason || 'No reason given',
            cancelled_at: getISTTimestamp(),
            updated_at: getISTTimestamp()
        })
        .eq('id', appointmentId);

    if (error) return { success: false, message: error.message };
    return { success: true };
};

/**
 * Doctor: Accept or Reject → calls Flask (handles DB update + email + log)
 * Doctor: Complete         → handled directly via Supabase (no email needed)
 */
export const respondToAppointment = async (appointmentId, action, doctorNote = '', doctorName = '') => {
    if (!isOnline()) {
        return { success: false, message: 'No internet connection. Please check your network.' };
    }

    // 'completed' → no email needed, update Supabase directly
    if (action === 'completed') {
        const { data: appt } = await supabase
            .from('appointments').select('status').eq('id', appointmentId).single();
        if (!appt) return { success: false, message: 'Appointment not found.' };
        if (appt.status !== 'accepted') {
            return { success: false, message: `Cannot mark a '${appt.status}' appointment as completed.` };
        }
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'completed', updated_at: getISTTimestamp() })
            .eq('id', appointmentId);
        if (error) return { success: false, message: error.message };
        return { success: true };
    }

    // 'accepted' or 'rejected' → call Flask (DB update + email patient + log)
    try {
        const res = await fetch('http://localhost:5050/api/send-status-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId, action, doctorNote, doctorName })
        });
        const data = await res.json();
        return data;
    } catch (err) {
        return { success: false, message: getErrorMessage(err, 'Could not reach the email server. Make sure the backend is running.') };
    }
};

/**
 * Admin: Update any appointment status with rules.
 * - completed  → Supabase directly (no email)
 * - accepted | rejected | cancelled → Flask (DB update + patient email)
 */
export const updateAppointmentStatus = async (appointmentId, newStatus, reason) => {
    if (!isOnline()) {
        return { success: false, message: 'No internet connection. Please check your network.' };
    }

    // completed → direct Supabase update, no email needed
    if (newStatus === 'completed') {
        const { data: appt } = await supabase
            .from('appointments')
            .select('status')
            .eq('id', appointmentId)
            .single();
        if (!appt) return { success: false, message: 'Appointment not found.' };
        if (appt.status !== 'accepted') {
            return { success: false, message: `Cannot mark a '${appt.status}' appointment as completed.` };
        }
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'completed', updated_at: getISTTimestamp() })
            .eq('id', appointmentId);
        if (error) return { success: false, message: error.message };
        return { success: true };
    }

    // accepted / rejected / cancelled → call Flask (updates DB + emails patient)
    try {
        const res = await fetch('http://localhost:5050/api/send-status-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointmentId,
                action:     newStatus,
                doctorNote: reason || '',
                doctorName: 'Admin'
            })
        });
        const data = await res.json();
        return data;
    } catch (err) {
        return { success: false, message: getErrorMessage(err, 'Could not reach the email server. Make sure the backend is running.') };
    }
};

/**
 * Admin-only: Permanently delete an appointment from the database.
 * Only allowed for final statuses: completed, rejected, cancelled, expired.
 */
export const deleteAppointment = async (appointmentId, currentStatus) => {
    const FINAL_STATUSES = ['completed', 'rejected', 'cancelled', 'expired'];
    if (!FINAL_STATUSES.includes(currentStatus)) {
        return { success: false, message: `Cannot delete an active '${currentStatus}' appointment. Change its status first.` };
    }
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
    if (error) return { success: false, message: error.message };
    return { success: true };
};

// End of database operations
