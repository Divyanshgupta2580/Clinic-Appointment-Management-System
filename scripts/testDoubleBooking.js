require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const { findNextAvailableSlot } = require('../utils/slotUtils');

async function testDoubleBookingConstraint() {
  console.log('====================================================');
  console.log('🧪 TESTING DATABASE-LEVEL DOUBLE-BOOKING CONSTRAINT');
  console.log('====================================================');

  await connectDB();

  // Ensure indexes are built in MongoDB
  await Appointment.syncIndexes();
  const indexes = await Appointment.collection.indexes();
  console.log('Active Appointment Indexes in MongoDB:');
  indexes.forEach((idx) => {
    console.log(` - Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}, Unique: ${!!idx.unique}`);
  });

  // Verify compound unique index exists
  const hasUniqueCompoundIndex = indexes.some(
    (idx) => idx.key.doctorId === 1 && idx.key.appointmentDate === 1 && idx.key.appointmentTime === 1 && idx.unique
  );

  if (!hasUniqueCompoundIndex) {
    throw new Error('❌ Compound unique index on (doctorId, appointmentDate, appointmentTime) was NOT found!');
  }
  console.log('✓ Compound unique index confirmed in MongoDB engine.');

  // Create temporary test users for verification
  const testDoctorId = new mongoose.Types.ObjectId();
  const testPatient1Id = new mongoose.Types.ObjectId();
  const testPatient2Id = new mongoose.Types.ObjectId();
  const testDate = '2026-10-15';
  const testTime = '10:00';

  // Clean any remnants for this test slot
  await Appointment.deleteMany({ doctorId: testDoctorId, appointmentDate: testDate });

  // Create temporary doctor profile to test next-slot algorithm
  await DoctorProfile.deleteMany({ userId: testDoctorId });
  await DoctorProfile.create({
    userId: testDoctorId,
    specialization: 'Cardiology',
    qualification: 'MD',
    experience: 10,
    consultationDuration: 30,
    availableDays: ['Thursday'], // 2026-10-15 is Thursday
    availableStartTime: '09:00',
    availableEndTime: '12:00',
  });

  console.log('\n--- Step 1: Patient 1 books 10:00 AM slot ---');
  const apt1 = await Appointment.create({
    patientId: testPatient1Id,
    doctorId: testDoctorId,
    appointmentDate: testDate,
    appointmentTime: testTime,
    status: 'pending',
    notes: 'Patient 1 Booking',
  });
  console.log(`✓ Booking 1 succeeded! Appointment ID: ${apt1._id}`);

  console.log('\n--- Step 2: Patient 2 attempts to book the EXACT same slot (Concurrent Simulation) ---');
  let duplicatePrevented = false;
  try {
    await Appointment.create({
      patientId: testPatient2Id,
      doctorId: testDoctorId,
      appointmentDate: testDate,
      appointmentTime: testTime,
      status: 'pending',
      notes: 'Patient 2 Race Attempt',
    });
    console.error('❌ ERROR: Duplicate appointment was incorrectly allowed!');
  } catch (err) {
    if (err.code === 11000) {
      duplicatePrevented = true;
      console.log('✓ SUCCESS: MongoDB E11000 Duplicate Key Error was correctly thrown by database engine!');
      console.log(`  Engine Message: ${err.message}`);
    } else {
      console.error('Unexpected error:', err);
    }
  }

  if (!duplicatePrevented) {
    throw new Error('Double booking prevention test failed!');
  }

  console.log('\n--- Step 3: Test Next Available Slot Algorithm for the Conflicted Patient ---');
  const nextSlot = await findNextAvailableSlot(testDoctorId, testDate, testTime);
  console.log(`Suggested Next Available Slot: ${JSON.stringify(nextSlot)}`);
  if (!nextSlot || nextSlot.time !== '10:30') {
    throw new Error(`Expected next slot 10:30, got ${nextSlot?.time}`);
  }
  console.log('✓ Next available slot correctly calculated as 10:30 AM!');

  // Cleanup test records
  await Appointment.deleteMany({ doctorId: testDoctorId });
  await DoctorProfile.deleteMany({ userId: testDoctorId });

  console.log('\n====================================================');
  console.log('🎉 ALL DOUBLE-BOOKING TESTS PASSED PERFECTLY!');
  console.log('====================================================');

  await closeDB();
  process.exit(0);
}

testDoubleBookingConstraint().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
