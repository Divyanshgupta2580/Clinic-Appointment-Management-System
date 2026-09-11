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

// 11 Demo Doctors across 10 medical specializations
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

/**
 * EXACT 20 APPOINTMENTS BLUEPRINT:
 * - 6 Pending
 * - 6 Confirmed ('accepted')
 * - 5 Completed ('completed')
 * - 3 Rejected ('rejected')
 * Total = 20 Appointments
 */
const demoAppointmentsBlueprint = [
  // ==================== 6 PENDING APPOINTMENTS ====================
  {
    docEmail: 'dr.marcus.vance@medipulse.demo',
    patientEmail: 'patient.emily@medipulse.demo',
    date: '2026-09-15',
    time: '09:00',
    status: 'pending',
    notes: 'Initial cardiac screening and blood pressure evaluation',
  },
  {
    docEmail: 'dr.elena.rostova@medipulse.demo',
    patientEmail: 'patient.sarah@medipulse.demo',
    date: '2026-09-11',
    time: '11:00',
    status: 'pending',
    notes: 'Persistent skin rash consultation and topical review',
  },
  {
    docEmail: 'dr.arthur.pendelton@medipulse.demo',
    patientEmail: 'patient.lucas@medipulse.demo',
    date: '2026-09-16',
    time: '14:30',
    status: 'pending',
    notes: 'Post-sprain ankle mobility follow-up consultation',
  },
  {
    docEmail: 'dr.rachel.thorne@medipulse.demo',
    patientEmail: 'patient.lucas@medipulse.demo',
    date: '2026-09-14',
    time: '11:00',
    status: 'pending',
    notes: 'Chronic migraine frequency evaluation and symptom journal',
  },
  {
    docEmail: 'dr.oliver.queen@medipulse.demo',
    patientEmail: 'patient.chloe@medipulse.demo',
    date: '2026-09-16',
    time: '11:00',
    status: 'pending',
    notes: 'Routine wellness physical examination and allergy inquiry',
  },
  {
    docEmail: 'dr.sophia.martinez@medipulse.demo',
    patientEmail: 'patient.emily@medipulse.demo',
    date: '2026-09-18',
    time: '14:00',
    status: 'pending',
    notes: 'Vision prescription update and dry eyes evaluation',
  },

  // ==================== 6 CONFIRMED APPOINTMENTS ====================
  {
    docEmail: 'dr.marcus.vance@medipulse.demo',
    patientEmail: 'patient.sarah@medipulse.demo',
    date: '2026-09-11',
    time: '10:00',
    status: 'accepted',
    notes: 'Cardiovascular checkup and resting ECG review',
  },
  {
    docEmail: 'dr.arthur.pendelton@medipulse.demo',
    patientEmail: 'patient.priya@medipulse.demo',
    date: '2026-09-14',
    time: '10:00',
    status: 'accepted',
    notes: 'Right knee joint stiffness and mobility assessment',
  },
  {
    docEmail: 'dr.tariq.almansoor@medipulse.demo',
    patientEmail: 'patient.chloe@medipulse.demo',
    date: '2026-09-14',
    time: '09:30',
    status: 'accepted',
    notes: 'Sinusitis follow-up and diagnostic nasal endoscopy',
  },
  {
    docEmail: 'dr.anita.desai@medipulse.demo',
    patientEmail: 'patient.sarah@medipulse.demo',
    date: '2026-09-15',
    time: '10:00',
    status: 'accepted',
    notes: 'Annual preventative wellness and health consultation',
  },
  {
    docEmail: 'dr.julian.croft@medipulse.demo',
    patientEmail: 'patient.michael@medipulse.demo',
    date: '2026-09-15',
    time: '11:00',
    status: 'accepted',
    notes: 'Bi-weekly cognitive behavioral therapy review session',
  },
  {
    docEmail: 'dr.elena.rostova@medipulse.demo',
    patientEmail: 'patient.priya@medipulse.demo',
    date: '2026-09-16',
    time: '10:00',
    status: 'accepted',
    notes: 'Dermal allergy patch testing and reaction monitoring',
  },

  // ==================== 5 COMPLETED APPOINTMENTS ====================
  {
    docEmail: 'dr.marcus.vance@medipulse.demo',
    patientEmail: 'patient.james@medipulse.demo',
    date: '2026-09-11',
    time: '14:00',
    status: 'completed',
    notes: 'Completed resting ECG and blood pressure consultation',
  },
  {
    docEmail: 'dr.maya.lin@medipulse.demo',
    patientEmail: 'patient.sarah@medipulse.demo',
    date: '2026-09-11',
    time: '09:30',
    status: 'completed',
    notes: 'Completed childhood seasonal immunization and milestone check',
  },
  {
    docEmail: 'dr.sophia.martinez@medipulse.demo',
    patientEmail: 'patient.daniel@medipulse.demo',
    date: '2026-09-14',
    time: '10:30',
    status: 'completed',
    notes: 'Completed comprehensive diabetic retinal examination',
  },
  {
    docEmail: 'dr.david.kim@medipulse.demo',
    patientEmail: 'patient.daniel@medipulse.demo',
    date: '2026-09-16',
    time: '15:30',
    status: 'completed',
    notes: 'Completed travel vaccinations and executive physical',
  },
  {
    docEmail: 'dr.tariq.almansoor@medipulse.demo',
    patientEmail: 'patient.michael@medipulse.demo',
    date: '2026-09-18',
    time: '11:30',
    status: 'completed',
    notes: 'Completed audiology screening and hearing report review',
  },

  // ==================== 3 REJECTED / DECLINED APPOINTMENTS ====================
  {
    docEmail: 'dr.marcus.vance@medipulse.demo',
    patientEmail: 'patient.michael@medipulse.demo',
    date: '2026-09-15',
    time: '14:00',
    status: 'rejected',
    notes: 'Declined: Request outside cardiology outpatient scope',
  },
  {
    docEmail: 'dr.rachel.thorne@medipulse.demo',
    patientEmail: 'patient.sarah@medipulse.demo',
    date: '2026-09-18',
    time: '14:00',
    status: 'rejected',
    notes: 'Declined: Patient requested tele-consultation which is not offered',
  },
  {
    docEmail: 'dr.anita.desai@medipulse.demo',
    patientEmail: 'patient.priya@medipulse.demo',
    date: '2026-09-18',
    time: '14:30',
    status: 'rejected',
    notes: 'Declined: Physician emergency surgical coverage; suggested next slot',
  },
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
    } else {
      // Ensure name and role are preserved
      docUser.name = docData.user.name;
      docUser.role = 'doctor';
      await docUser.save();
    }

    let profile = await DoctorProfile.findOne({ userId: docUser._id });
    if (!profile) {
      profile = await DoctorProfile.create({
        userId: docUser._id,
        ...docData.profile,
      });
      console.log(`[Seed] Created DoctorProfile for: Dr. ${docData.user.name} [${docData.profile.specialization}]`);
    } else {
      // Update profile attributes to ensure accurate specialization/hours
      Object.assign(profile, docData.profile);
      await profile.save();
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
      patientUser.name = patientData.name;
      patientUser.role = 'patient';
      await patientUser.save();
    }
    patientMap[patientData.email] = patientUser;
  }

  // 4. Seed / Synchronize Appointments
  const activeBlueprintKeys = new Set();
  let createdCount = 0;
  let updatedCount = 0;

  for (const aptData of demoAppointmentsBlueprint) {
    const docUser = doctorMap[aptData.docEmail];
    const patientUser = patientMap[aptData.patientEmail];

    if (!docUser || !patientUser) {
      console.warn(`[Seed] Skipping appointment, missing doctor or patient: ${aptData.docEmail}`);
      continue;
    }

    const slotKey = `${docUser._id.toString()}_${aptData.date}_${aptData.time}`;
    activeBlueprintKeys.add(slotKey);

    const existing = await Appointment.findOne({
      doctorId: docUser._id,
      appointmentDate: aptData.date,
      appointmentTime: aptData.time,
    });

    if (existing) {
      existing.patientId = patientUser._id;
      existing.status = aptData.status;
      existing.notes = aptData.notes;
      await existing.save();
      updatedCount++;
    } else {
      await Appointment.create({
        patientId: patientUser._id,
        doctorId: docUser._id,
        appointmentDate: aptData.date,
        appointmentTime: aptData.time,
        status: aptData.status,
        notes: aptData.notes,
      });
      createdCount++;
    }
  }

  // Remove any stale demo appointments that are between demo accounts but not in the 20 blueprint items
  const demoDocIds = Object.values(doctorMap).map((d) => d._id);
  const demoPatientIds = Object.values(patientMap).map((p) => p._id);

  const staleDemoApts = await Appointment.find({
    doctorId: { $in: demoDocIds },
    patientId: { $in: demoPatientIds },
  });

  let prunedCount = 0;
  for (const apt of staleDemoApts) {
    const slotKey = `${apt.doctorId.toString()}_${apt.appointmentDate}_${apt.appointmentTime}`;
    if (!activeBlueprintKeys.has(slotKey)) {
      await Appointment.deleteOne({ _id: apt._id });
      prunedCount++;
    }
  }

  console.log(`[Seed] Appointments synchronized: ${createdCount} created, ${updatedCount} updated, ${prunedCount} stale demo slots pruned.`);

  // Verify status breakdown
  const statusAggregation = await Appointment.aggregate([
    {
      $match: {
        doctorId: { $in: demoDocIds },
        patientId: { $in: demoPatientIds },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const distribution = statusAggregation.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const [totalDocs, totalPatients, totalDemoApts] = await Promise.all([
    DoctorProfile.countDocuments({ userId: { $in: demoDocIds } }),
    User.countDocuments({ email: { $regex: /@medipulse\.demo$/ }, role: 'patient' }),
    Appointment.countDocuments({ doctorId: { $in: demoDocIds }, patientId: { $in: demoPatientIds } }),
  ]);

  console.log('\n====================================================');
  console.log('[Seed] SUMMARY OF DEMO DATASET:');
  console.log(` - Total Demo Doctors with Profiles: ${totalDocs}`);
  console.log(` - Total Demo Registered Patients:   ${totalPatients}`);
  console.log(` - Total Demo Appointments:          ${totalDemoApts}`);
  console.log(' - Appointment Distribution:');
  console.log(`     • Pending:   ${distribution['pending'] || 0} (Expected: 6)`);
  console.log(`     • Confirmed: ${distribution['accepted'] || 0} (Expected: 6)`);
  console.log(`     • Completed: ${distribution['completed'] || 0} (Expected: 5)`);
  console.log(`     • Rejected:  ${distribution['rejected'] || 0} (Expected: 3)`);
  console.log(` - Default Demo Password:             ${DEMO_PASSWORD}`);
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
