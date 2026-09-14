import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDB, closeDB } from '../src/config/database';
import { User } from '../src/models/User';
import { DoctorProfile } from '../src/models/DoctorProfile';
import { Appointment } from '../src/models/Appointment';
import { QueueEntry } from '../src/models/QueueEntry';
import { getTodayStr } from '../src/utils/timeUtils';

describe('Comprehensive End-to-End Integration & Concurrency Tests', () => {
  const app = createApp();
  const testSuffix = Date.now();

  const testDoctorEmail = `doc_${testSuffix}@medipulse.test`;
  const testPatient1Email = `patient1_${testSuffix}@medipulse.test`;
  const testPatient2Email = `patient2_${testSuffix}@medipulse.test`;
  const testReceptionistEmail = `rec_${testSuffix}@medipulse.test`;
  const testAdminEmail = `admin_${testSuffix}@medipulse.test`;
  const testPassword = 'SecurePassword123!';

  let doctorToken: string;
  let doctorId: string;
  let patient1Token: string;
  let patient1Id: string;
  let patient2Token: string;
  let receptionistToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await connectDB();
    await Appointment.syncIndexes();
  });

  afterAll(async () => {
    // Clean up temporary test accounts and appointments
    const testUsers = await User.find({ email: { $regex: /@medipulse\.test$/ } });
    const userIds = testUsers.map((u) => u._id);

    await Appointment.deleteMany({
      $or: [{ patientId: { $in: userIds } }, { doctorId: { $in: userIds } }],
    });
    await QueueEntry.deleteMany({
      $or: [{ patientId: { $in: userIds } }, { doctorId: { $in: userIds } }],
    });
    await DoctorProfile.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    await closeDB();
  });

  // 1. REGISTRATION & AUTHENTICATION
  describe('1. Authentication & Role Registration', () => {
    it('should register a new Doctor and create DoctorProfile', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Dr. Test Cardiology',
        email: testDoctorEmail,
        password: testPassword,
        role: 'doctor',
        specialization: 'Cardiology',
        qualification: 'MD',
        experience: 10,
        consultationDuration: 30,
        availableStartTime: '09:00',
        availableEndTime: '17:00',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('doctor');
      doctorToken = res.body.token;
      doctorId = res.body.user._id;

      const profile = await DoctorProfile.findOne({ userId: doctorId });
      expect(profile).toBeDefined();
      expect(profile?.specialization).toBe('Cardiology');
    });

    it('should register Patient 1 and Patient 2', async () => {
      const res1 = await request(app).post('/api/v1/auth/register').send({
        name: 'Patient Alice',
        email: testPatient1Email,
        password: testPassword,
        role: 'patient',
      });
      expect(res1.status).toBe(201);
      patient1Token = res1.body.token;
      patient1Id = res1.body.user._id;

      const res2 = await request(app).post('/api/v1/auth/register').send({
        name: 'Patient Bob',
        email: testPatient2Email,
        password: testPassword,
        role: 'patient',
      });
      expect(res2.status).toBe(201);
      patient2Token = res2.body.token;
    });

    it('should register Receptionist and Admin', async () => {
      const resRec = await request(app).post('/api/v1/auth/register').send({
        name: 'Receptionist Rachel',
        email: testReceptionistEmail,
        password: testPassword,
        role: 'receptionist',
      });
      expect(resRec.status).toBe(201);
      receptionistToken = resRec.body.token;

      const resAdmin = await request(app).post('/api/v1/auth/register').send({
        name: 'Admin Alex',
        email: testAdminEmail,
        password: testPassword,
        role: 'admin',
      });
      expect(resAdmin.status).toBe(201);
      adminToken = resAdmin.body.token;
    });

    it('should reject login with wrong password (401)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testDoctorEmail,
        password: 'wrong-password',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testDoctorEmail,
        password: testPassword,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });

  // 2. ROLE-BASED ACCESS CONTROL (RBAC)
  describe('2. Role-Based Access Control', () => {
    it('Patient should receive 403 when attempting to access doctor routes', async () => {
      const res = await request(app)
        .patch(`/api/v1/doctors/${doctorId}/availability`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ consultationDuration: 45 });

      expect(res.status).toBe(403);
    });

    it('Doctor should receive 403 when attempting to access admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('Admin should be permitted to access admin user management', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 3. APPOINTMENT BOOKING & ATOMIC DOUBLE-BOOKING CONCURRENCY
  describe('3. Atomic Double-Booking Prevention & Concurrency', () => {
    const targetDate = '2026-11-20';
    const targetTime = '10:00';
    let bookedAppointmentId: string;

    it('should simultaneously book the exact same slot and verify only one succeeds', async () => {
      // Simulate concurrent requests at the exact same moment
      const [attempt1, attempt2] = await Promise.all([
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${patient1Token}`)
          .send({
            doctorId,
            appointmentDate: targetDate,
            appointmentTime: targetTime,
            notes: 'Patient 1 Consultation',
          }),
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${patient2Token}`)
          .send({
            doctorId,
            appointmentDate: targetDate,
            appointmentTime: targetTime,
            notes: 'Patient 2 Consultation',
          }),
      ]);

      const statuses = [attempt1.status, attempt2.status].sort();
      // Exactly one must be 201 Created and one must be 409 Conflict
      expect(statuses).toEqual([201, 409]);

      const successResponse = attempt1.status === 201 ? attempt1 : attempt2;
      const conflictResponse = attempt1.status === 409 ? attempt1 : attempt2;

      bookedAppointmentId = successResponse.body.appointment._id;
      expect(successResponse.body.appointment.status).toBe('PENDING');

      // Verify conflict response provides suggested next slot
      expect(conflictResponse.body.success).toBe(false);
      expect(conflictResponse.body.suggestedSlot).toBeDefined();
      expect(conflictResponse.body.suggestedSlot.date).toBe(targetDate);
      expect(conflictResponse.body.suggestedSlot.time).not.toBe(targetTime);
    });

    it('Doctor confirms the pending appointment', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${bookedAppointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('CONFIRMED');
    });
  });

  // 4. SMART CLINIC QUEUE & WAITING-TIME MANAGEMENT
  describe('4. Smart Clinic Queue & Waiting-Time Engine', () => {
    let queueEntryId: string;
    let appointmentIdForToday: string;
    const today = getTodayStr();

    beforeAll(async () => {
      // Create confirmed appointment for today to test check-in
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId,
          appointmentDate: today,
          appointmentTime: '11:00',
          notes: "Today's visit",
        });

      appointmentIdForToday = res.body.appointment._id;

      await request(app)
        .patch(`/api/v1/appointments/${appointmentIdForToday}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'CONFIRMED' });
    });

    it('Patient checks in for today confirmed appointment', async () => {
      const res = await request(app)
        .post('/api/v1/queue/check-in')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ appointmentId: appointmentIdForToday });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queueEntry).toBeDefined();
      expect(res.body.queueEntry.queueNumber).toBe(1);
      expect(res.body.queueEntry.status).toBe('WAITING');
      expect(res.body.disclaimer).toBeDefined();

      queueEntryId = res.body.queueEntry._id;
    });

    it('Patient views live queue status (0 patients ahead, 0 wait time)', async () => {
      const res = await request(app)
        .get('/api/v1/queue/my-status')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasActiveQueueEntry).toBe(true);
      expect(res.body.queueNumber).toBe(1);
      expect(res.body.patientsAhead).toBe(0);
      expect(res.body.estimatedWaitMinutes).toBe(0);
      expect(res.body.disclaimer).toBeDefined();
    });

    it('Receptionist registers a walk-in patient into the queue', async () => {
      const res = await request(app)
        .post('/api/v1/queue/walk-in')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          doctorId,
          patientName: 'Walk-in John',
          priority: 1,
          notes: 'Walk-in flu symptoms',
        });

      expect(res.status).toBe(201);
      expect(res.body.queueEntry.queueNumber).toBe(2);
      expect(res.body.queueEntry.isWalkIn).toBe(true);
      // Second in line has 1 patient ahead: 1 * 30 min = 30 minutes wait
      expect(res.body.queueEntry.estimatedWaitMinutes).toBe(30);
    });

    it('Doctor calls the next patient (status WAITING -> CALLED)', async () => {
      const res = await request(app)
        .post('/api/v1/queue/call-next')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ doctorId, date: today });

      expect(res.status).toBe(200);
      expect(res.body.calledPatient).toBeDefined();
      expect(res.body.calledPatient.queueNumber).toBe(1);
      expect(res.body.calledPatient.status).toBe('CALLED');
    });

    it('Doctor starts consultation (status CALLED -> IN_CONSULTATION)', async () => {
      const res = await request(app)
        .post(`/api/v1/queue/${queueEntryId}/start`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.queueEntry.status).toBe('IN_CONSULTATION');
    });

    it('Doctor completes consultation (status IN_CONSULTATION -> COMPLETED)', async () => {
      const res = await request(app)
        .post(`/api/v1/queue/${queueEntryId}/complete`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.queueEntry.status).toBe('COMPLETED');
    });

    it('Doctor views today queue summary', async () => {
      const res = await request(app)
        .get(`/api/v1/queue/today?doctorId=${doctorId}&date=${today}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalToday).toBe(2);
      expect(res.body.completedCount).toBe(1);
      expect(res.body.waitingCount).toBe(1); // Walk-in is now next
      expect(res.body.disclaimer).toBeDefined();
    });
  });
});
