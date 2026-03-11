// ─────────────────────────────────────────────────────────────
// seedData.js
// Demo data for CityCare Hospital project.
// NOTE: All doctors and credentials here are fictional / for demo only.
// ─────────────────────────────────────────────────────────────

// Alternate-day schedules so 2 doctors of the same specialization don't overlap
const GROUP_A_DAYS = ['Monday', 'Wednesday', 'Friday', 'Sunday'];   // Doc 1
const GROUP_B_DAYS = ['Tuesday', 'Thursday', 'Saturday', 'Sunday']; // Doc 2 (both available Sunday)

// Time slots spread across morning, afternoon, and evening
const ALL_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM',
  '03:00 PM', '04:00 PM', '05:00 PM'
];

// 16 doctors — 2 per specialization, on alternate days
export const seedDoctors = [

  // ── Cardiology ──────────────────────────────────────────────
  {
    id: 'doc1',
    name: 'Dr. Sarah Mitchell',
    specialization: 'Cardiology',
    designation: 'Senior Cardiologist',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc9',
    name: 'Dr. Thomas Anderson',
    specialization: 'Cardiology',
    designation: 'Consultant Cardiologist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── Neurology ───────────────────────────────────────────────
  {
    id: 'doc2',
    name: 'Dr. James Wilson',
    specialization: 'Neurology',
    designation: 'Consultant Neurologist',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc10',
    name: 'Dr. Aisha Patel',
    specialization: 'Neurology',
    designation: 'Neurologist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── Dermatology ─────────────────────────────────────────────
  {
    id: 'doc3',
    name: 'Dr. Emily Chen',
    specialization: 'Dermatology',
    designation: 'Chief Dermatologist',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc11',
    name: 'Dr. Marcus Johnson',
    specialization: 'Dermatology',
    designation: 'Consultant Dermatologist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── Orthopedics ─────────────────────────────────────────────
  {
    id: 'doc4',
    name: 'Dr. Michael Brown',
    specialization: 'Orthopedics',
    designation: 'Orthopedic Surgeon',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc12',
    name: 'Dr. Fatima Khan',
    specialization: 'Orthopedics',
    designation: 'Joint Replacement Specialist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── General Medicine ────────────────────────────────────────
  {
    id: 'doc5',
    name: 'Dr. Priya Sharma',
    specialization: 'General Medicine',
    designation: 'General Physician',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc13',
    name: 'Dr. Carlos Rivera',
    specialization: 'General Medicine',
    designation: 'Family Medicine Specialist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── Gastroenterology ────────────────────────────────────────
  {
    id: 'doc6',
    name: 'Dr. Robert Taylor',
    specialization: 'Gastroenterology',
    designation: 'Gastroenterologist',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc14',
    name: 'Dr. Mei Lin',
    specialization: 'Gastroenterology',
    designation: 'Digestive Health Specialist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── Pediatrics ──────────────────────────────────────────────
  {
    id: 'doc7',
    name: 'Dr. Lisa Anderson',
    specialization: 'Pediatrics',
    designation: 'Pediatrician',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc15',
    name: 'Dr. Arjun Mehta',
    specialization: 'Pediatrics',
    designation: 'Child Health Specialist',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  },

  // ── ENT ─────────────────────────────────────────────────────
  {
    id: 'doc8',
    name: 'Dr. David Kim',
    specialization: 'ENT',
    designation: 'ENT Specialist',
    availableDays: GROUP_A_DAYS,
    timeSlots: ALL_SLOTS
  },
  {
    id: 'doc16',
    name: 'Dr. Sofia Martinez',
    specialization: 'ENT',
    designation: 'Head & Neck Surgeon',
    availableDays: GROUP_B_DAYS,
    timeSlots: ALL_SLOTS
  }
];

// Admin staff credentials (demo only)
export const adminCredentials = {
  email: 'admin@citycare.com',
  password: 'admin123'
};

// List of all specializations (used in chatbot and search)
export const specializations = [
  'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics',
  'General Medicine', 'Gastroenterology', 'Pediatrics', 'ENT'
];
