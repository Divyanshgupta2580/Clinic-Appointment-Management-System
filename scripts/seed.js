require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

const DEMO_PASSWORD = 'DemoPassword123!';

// 1 Admin Account
const demoAdmin = {
  name: 'Admin Administrator',
  email: 'admin@medipulse.demo',
  role: 'admin',
};

// 11 Demo Doctors across 10 specialties
const demoDoctors = [
  {
    user: { name: 'Marcus Vance', email: 'dr.marcus.vance@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Cardiology',
      qualification: 'MD, FACC',
      experience: 14,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '17:00',
    },
  },
  {
    user: { name: 'Elena Rostova', email: 'dr.elena.rostova@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Dermatology',
      qualification: 'MD, FAAD',
      experience: 9,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '16:30',
    },
  },
  {
    user: { name: 'Arthur Pendelton', email: 'dr.arthur.pendelton@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Orthopedics',
      qualification: 'MS (Ortho), FRCS',
      experience: 16,
      consultationDuration: 45,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      availableStartTime: '10:00',
      availableEndTime: '18:00',
    },
  },
  {
    user: { name: 'Maya Lin', email: 'dr.maya.lin@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Pediatrics',
      qualification: 'MD (Peds), FAAP',
      experience: 8,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '08:30',
      availableEndTime: '16:00',
    },
  },
  {
    user: { name: 'David Kim', email: 'dr.david.kim@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (Internal Med)',
      experience: 12,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      availableStartTime: '09:00',
      availableEndTime: '17:00',
    },
  },
  {
    user: { name: 'Rachel Thorne', email: 'dr.rachel.thorne@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Neurology',
      qualification: 'DM (Neuro), MD',
      experience: 11,
      consultationDuration: 45,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '10:00',
      availableEndTime: '16:00',
    },
  },
  {
    user: { name: 'Tariq Al-Mansoor', email: 'dr.tariq.almansoor@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'ENT',
      qualification: 'MS (Otolaryngology)',
      experience: 10,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '17:00',
    },
  },
  {
    user: { name: 'Sophia Martinez', email: 'dr.sophia.martinez@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Ophthalmology',
      qualification: 'MS (Ophth), DO',
      experience: 7,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      availableStartTime: '09:30',
      availableEndTime: '16:30',
    },
  },
  {
    user: { name: 'Anita Desai', email: 'dr.anita.desai@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Gynecology',
      qualification: 'MD, DGO',
      experience: 15,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '16:00',
    },
  },
  {
    user: { name: 'Julian Croft', email: 'dr.julian.croft@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'Psychiatry',
      qualification: 'MD (Psychiatry)',
      experience: 13,
      consultationDuration: 60,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '10:00',
      availableEndTime: '18:00',
    },
  },
  {
    user: { name: 'Oliver Queen', email: 'dr.oliver.queen@medipulse.demo', role: 'doctor' },
    profile: {
      specialization: 'General Medicine',
      qualification: 'MBBS',
      experience: 6,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '08:00',
      availableEndTime: '15:00',
    },
  },
];

// 8 Demo Patients
const demoPatients = [
  { name: 'Sarah Jenkins', email: 'patient.sarah@medipulse.demo', role: 'patient' },
  { name: 'Michael Chang', email: 'patient.michael@medipulse.demo', role: 'patient' },
  { name: 'Emily Watson', email: 'patient.emily@medipulse.demo', role: 'patient' },
  { name: 'James Rodriguez', email: 'patient.james@medipulse.demo', role: 'patient' },
  { name: 'Priya Sharma', email: 'patient.priya@medipulse.demo', role: 'patient' },
  { name: 'Lucas Bennett', email: 'patient.lucas@medipulse.demo', role: 'patient' },
  { name: 'Chloe Martin', email: 'patient.chloe@medipulse.demo', role: 'patient' },
  { name: 'Daniel Brooks', email: 'patient.daniel@medipulse.demo', role: 'patient' },
];

// 20 Structured Appointments (Distributed across doctors & patients with realistic statuses)
const demoAppointmentsBlueprint = [
  // Today's schedule (2026-09-11, Friday)
  { docEmail: 'dr.marcus.vance@medipulse.demo', patientEmail: 'patient.sarah@medipulse.demo', date: '2026-09-11', time: '10:00', status: 'accepted', notes: 'Routine cardiovascular checkup and ECG review' },
  { docEmail: 'dr.elena.rostova@medipulse.demo', patientEmail: 'patient.michael@medipulse.demo', date: '2026-09-11', time: '11:00', status: 'pending', notes: 'Persistent skin rash consultation' },
  { docEmail: 'dr.david.kim@medipulse.demo', patientEmail: 'patient.emily@medipulse.demo', date: '2026-09-11', time: '14:00', status: 'completed', notes: 'Annual wellness exam and blood pressure check' },
  { docEmail: 'dr.maya.lin@medipulse.demo', patientEmail: 'patient.james@medipulse.demo', date: '2026-09-11', time: '09:30', status: 'completed', notes: 'Childhood seasonal immunization' },

  // Monday (2026-09-14)
  { docEmail: 'dr.arthur.pendelton@medipulse.demo', patientEmail: 'patient.priya@medipulse.demo', date: '2026-09-14', time: '10:00', status: 'accepted', notes: 'Right knee joint stiffness and mobility assessment' },
  { docEmail: 'dr.rachel.thorne@medipulse.demo', patientEmail: 'patient.lucas@medipulse.demo', date: '2026-09-14', time: '11:00', status: 'pending', notes: 'Chronic migraine frequency evaluation' },
  { docEmail: 'dr.tariq.almansoor@medipulse.demo', patientEmail: 'patient.chloe@medipulse.demo', date: '2026-09-14', time: '09:30', status: 'accepted', notes: 'Sinusitis follow-up and nasal endoscopy' },
  { docEmail: 'dr.sophia.martinez@medipulse.demo', patientEmail: 'patient.daniel@medipulse.demo', date: '2026-09-14', time: '10:30', status: 'completed', notes: 'Comprehensive diabetic retinal screening' },

  // Tuesday (2026-09-15)
  { docEmail: 'dr.anita.desai@medipulse.demo', patientEmail: 'patient.sarah@medipulse.demo', date: '2026-09-15', time: '10:00', status: 'accepted', notes: 'Preventative health consultation' },
  { docEmail: 'dr.julian.croft@medipulse.demo', patientEmail: 'patient.michael@medipulse.demo', date: '2026-09-15', time: '11:00', status: 'accepted', notes: 'Cognitive behavioral therapy session' },
  { docEmail: 'dr.oliver.queen@medipulse.demo', patientEmail: 'patient.emily@medipulse.demo', date: '2026-09-15', time: '09:00', status: 'pending', notes: 'Follow-up for mild iron deficiency' },
  { docEmail: 'dr.marcus.vance@medipulse.demo', patientEmail: 'patient.james@medipulse.demo', date: '2026-09-15', time: '14:00', status: 'rejected', notes: 'Request outside normal cardiology referral scope' },

  // Wednesday (2026-09-16)
  { docEmail: 'dr.elena.rostova@medipulse.demo', patientEmail: 'patient.priya@medipulse.demo', date: '2026-09-16', time: '10:00', status: 'accepted', notes: 'Dermal allergy patch testing' },
  { docEmail: 'dr.arthur.pendelton@medipulse.demo', patientEmail: 'patient.lucas@medipulse.demo', date: '2026-09-16', time: '14:30', status: 'pending', notes: 'Post-sprain ankle mobility follow-up' },
  { docEmail: 'dr.maya.lin@medipulse.demo', patientEmail: 'patient.chloe@medipulse.demo', date: '2026-09-16', time: '11:00', status: 'pending', notes: 'Pediatric wellness and growth monitoring' },
  { docEmail: 'dr.david.kim@medipulse.demo', patientEmail: 'patient.daniel@medipulse.demo', date: '2026-09-16', time: '15:30', status: 'completed', notes: 'Travel vaccinations and general physical' },

  // Friday (2026-09-18)
  { docEmail: 'dr.rachel.thorne@medipulse.demo', patientEmail: 'patient.sarah@medipulse.demo', date: '2026-09-18', time: '14:00', status: 'rejected', notes: 'Patient requested tele-consultation which is not offered' },
  { docEmail: 'dr.tariq.almansoor@medipulse.demo', patientEmail: 'patient.michael@medipulse.demo', date: '2026-09-18', time: '11:30', status: 'completed', notes: 'Hearing assessment and audiology report review' },
  { docEmail: 'dr.sophia.martinez@medipulse.demo', patientEmail: 'patient.emily@medipulse.demo', date: '2026-09-18', time: '14:00', status: 'completed', notes: 'Refractive vision test and prescription check' },
  { docEmail: 'dr.anita.desai@medipulse.demo', patientEmail: 'patient.priya@medipulse.demo', date: '2026-09-18', time: '14:30', status: 'rejected', notes: 'Scheduling conflict resolved with next available slot' },
];

async function seedDatabase() {
  console.log('====================================================');
  console.log('[Seed] Starting Safe Idempotent Demo Data Seeding');
  console.log('====================================================');

  await connectDB();

  // Ensure database indexes exist
  await Appointment.syncIndexes();
  await DoctorProfile.syncIndexes();
  await User.syncIndexes();

  // Hash password once with bcrypt
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);

  // 1. Seed Admin Account
  let adminUser = await User.findOne({ email: demoAdmin.email });
  if (!adminUser) {
    adminUser = await User.create({
      ...demoAdmin,
      passwordHash,
    });
    console.log(`[Seed] Created Admin: ${demoAdmin.email}`);
  } else {
    console.log(`[Seed] Admin already exists: ${demoAdmin.email}`);
  }

  // 2. Seed Doctor Accounts & Profiles
  const doctorMap = {};
  for (const docData of demoDoctors) {
    let docUser = await User.findOne({ email: docData.user.email });
    if (!docUser) {
      docUser = await User.create({
        ...docData.user,
        passwordHash,
      });
      console.log(`[Seed] Created Doctor User: ${docData.user.name} (${docData.user.email})`);
    }

    let profile = await DoctorProfile.findOne({ userId: docUser._id });
    if (!profile) {
      profile = await DoctorProfile.create({
        userId: docUser._id,
        ...docData.profile,
      });
      console.log(`[Seed] Created DoctorProfile for: Dr. ${docData.user.name} [${docData.profile.specialization}]`);
    }

    doctorMap[docData.user.email] = docUser;
  }

  // 3. Seed Patient Accounts
  const patientMap = {};
  for (const patientData of demoPatients) {
    let patientUser = await User.findOne({ email: patientData.email });
    if (!patientUser) {
      patientUser = await User.create({
        ...patientData,
        passwordHash,
      });
      console.log(`[Seed] Created Patient: ${patientData.name} (${patientData.email})`);
    } else {
      console.log(`[Seed] Patient already exists: ${patientData.email}`);
    }
    patientMap[patientData.email] = patientUser;
  }

  // 4. Seed Appointments
  let createdAptCount = 0;
  for (const aptData of demoAppointmentsBlueprint) {
    const docUser = doctorMap[aptData.docEmail];
    const patientUser = patientMap[aptData.patientEmail];

    if (!docUser || !patientUser) {
      console.warn(`[Seed] Skipping appointment, missing doctor or patient: ${aptData.docEmail}`);
      continue;
    }

    // Check if appointment already exists for this slot
    const existing = await Appointment.findOne({
      doctorId: docUser._id,
      appointmentDate: aptData.date,
      appointmentTime: aptData.time,
    });

    if (!existing) {
      await Appointment.create({
        patientId: patientUser._id,
        doctorId: docUser._id,
        appointmentDate: aptData.date,
        appointmentTime: aptData.time,
        status: aptData.status,
        notes: aptData.notes,
      });
      createdAptCount++;
    }
  }

  console.log(`[Seed] Appointments processed. (${createdAptCount} newly inserted, remainder already present)`);

  const [totalDocs, totalPatients, totalApts] = await Promise.all([
    DoctorProfile.countDocuments(),
    User.countDocuments({ role: 'patient' }),
    Appointment.countDocuments(),
  ]);

  console.log('\n====================================================');
  console.log('[Seed] SUMMARY OF DATABASE DEMO POPULATION:');
  console.log(` - Total Doctors with Profiles: ${totalDocs}`);
  console.log(` - Total Registered Patients:   ${totalPatients}`);
  console.log(` - Total Appointments:          ${totalApts}`);
  console.log(` - Default Demo Password:       ${DEMO_PASSWORD}`);
  console.log('====================================================');
  console.log('[Seed] SAFE SEEDING COMPLETED SUCCESSFULLY!');

  await closeDB();
  process.exit(0);
}

seedDatabase().catch(async (err) => {
  console.error('[Seed Error] Seeding failed:', err.message);
  await closeDB().catch(() => {});
  process.exit(1);
});
