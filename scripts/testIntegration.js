require('dotenv').config();
const http = require('http');
const app = require('../app');
const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

let testServer = null;
let BASE_URL = process.env.TEST_URL;

// Simple cookie-jar HTTP request helper
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      if (typeof body === 'object') {
        payload = new URLSearchParams(body).toString();
        reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        payload = body;
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: resBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  return setCookie[0].split(';')[0];
}

async function startTestServerIfNeeded() {
  if (BASE_URL) return;

  await connectDB();
  return new Promise((resolve) => {
    testServer = app.listen(0, '127.0.0.1', () => {
      const assignedPort = testServer.address().port;
      BASE_URL = `http://127.0.0.1:${assignedPort}`;
      console.log(`[Test Server] Ephemeral server running on ${BASE_URL}`);
      resolve();
    });
  });
}

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('[TEST] RUNNING END-TO-END HTTP INTEGRATION TESTS');
  console.log('====================================================\n');

  await startTestServerIfNeeded();

  // Test 1: Public Home Page
  console.log('1. Testing GET / (Landing Page)...');
  const resHome = await request('GET', '/');
  if (resHome.statusCode !== 200 || !resHome.body.includes('MediPulse')) {
    throw new Error(`Landing page failed with status ${resHome.statusCode}`);
  }
  console.log('[PASS] Landing page responded with HTTP 200 and branded content.');

  // Test 2: Unauthenticated protection
  console.log('\n2. Testing unauthenticated access to /patient/dashboard...');
  const resUnauth = await request('GET', '/patient/dashboard');
  if (resUnauth.statusCode !== 302 || !resUnauth.headers.location?.includes('/auth/login')) {
    throw new Error(`Expected redirect to /auth/login, got status ${resUnauth.statusCode}`);
  }
  console.log('[PASS] Protected route correctly redirected unauthenticated request to /auth/login (HTTP 302).');

  // Test 3: Invalid Login
  console.log('\n3. Testing invalid credentials login...');
  const resBadLogin = await request('POST', '/auth/login', {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  });
  if (resBadLogin.statusCode !== 401) {
    throw new Error(`Expected 401 for bad login, got ${resBadLogin.statusCode}`);
  }
  console.log('[PASS] Invalid login correctly rejected with HTTP 401.');

  // Unique timestamp to isolate test data
  const testId = Date.now();
  const docEmail = `dr.integration.${testId}@testclinic.com`;
  const patientEmail = `patient.integration.${testId}@testclinic.com`;
  const testPassword = 'TestPassword123!';
  const testBookingDate = '2026-11-20'; // Friday

  // Test 4: Register Doctor Account
  console.log('\n4. Registering test Doctor account...');
  const resRegDoc = await request('POST', '/auth/register', {
    name: `Dr. Tester ${testId}`,
    email: docEmail,
    password: testPassword,
    role: 'doctor',
    specialization: 'Cardiology',
    qualification: 'MD, FACC',
    experience: '12',
    consultationDuration: '30',
    availableStartTime: '09:00',
    availableEndTime: '12:00',
  });

  if (resRegDoc.statusCode !== 302 || !resRegDoc.headers.location?.includes('/doctor/dashboard')) {
    throw new Error(`Doctor registration failed: ${resRegDoc.statusCode}, body: ${resRegDoc.body}`);
  }
  const docCookie = extractCookie(resRegDoc.headers);
  console.log('[PASS] Doctor successfully registered and redirected to /doctor/dashboard.');

  // Test 5: Verify Role Authorization Block
  console.log('\n5. Testing RBAC: Doctor accessing patient-only route...');
  const resDocAccessPatient = await request('GET', '/patient/dashboard', null, { Cookie: docCookie });
  if (resDocAccessPatient.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for cross-role access, got ${resDocAccessPatient.statusCode}`);
  }
  console.log('[PASS] Role authorization blocked Doctor from patient dashboard with HTTP 403 Forbidden.');

  // Test 6: Register Patient Account
  console.log('\n6. Registering test Patient account...');
  const resRegPatient = await request('POST', '/auth/register', {
    name: `Patient Alice ${testId}`,
    email: patientEmail,
    password: testPassword,
    role: 'patient',
  });

  if (resRegPatient.statusCode !== 302 || !resRegPatient.headers.location?.includes('/patient/dashboard')) {
    throw new Error(`Patient registration failed: ${resRegPatient.statusCode}`);
  }
  const patientCookie = extractCookie(resRegPatient.headers);
  console.log('[PASS] Patient successfully registered and redirected to /patient/dashboard.');

  // Test 7: Verify Patient Role Block
  console.log('\n7. Testing RBAC: Patient accessing doctor-only route...');
  const resPatientAccessDoc = await request('GET', '/doctor/dashboard', null, { Cookie: patientCookie });
  if (resPatientAccessDoc.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for cross-role access, got ${resPatientAccessDoc.statusCode}`);
  }
  console.log('[PASS] Role authorization blocked Patient from doctor dashboard with HTTP 403 Forbidden.');

  // Test 8: Doctor Directory Search
  console.log('\n8. Finding test Doctor in public/patient directory...');
  const resSearch = await request('GET', `/patient/doctors?search=${encodeURIComponent(docEmail)}`, null, {
    Cookie: patientCookie,
  });
  if (resSearch.statusCode !== 200 || !resSearch.body.includes(docEmail)) {
    throw new Error(`Doctor not found in directory listing: ${resSearch.statusCode}`);
  }
  const doctorUser = await User.findOne({ email: docEmail });
  const doctorId = doctorUser._id.toString();
  console.log(`[PASS] Doctor discovered in directory. Doctor ID: ${doctorId}`);

  // Test 9: Get Available Slots via JSON API
  console.log('\n9. Fetching available slots via JSON API...');
  const resSlots = await request('GET', `/api/doctors/${doctorId}/available-slots?date=${testBookingDate}`);
  if (resSlots.statusCode !== 200) {
    throw new Error(`Failed to fetch slots: ${resSlots.statusCode}`);
  }
  const slotsJson = JSON.parse(resSlots.body);
  if (!slotsJson.success || !slotsJson.availableSlots.includes('09:30')) {
    throw new Error(`Slot 09:30 not in available slots: ${resSlots.body}`);
  }
  console.log(`[PASS] Slots API returned ${slotsJson.availableSlots.length} available slots for ${testBookingDate}.`);

  // Test 10: Patient Books Appointment
  console.log('\n10. Booking appointment at 09:30 AM...');
  const resBook = await request(
    'POST',
    '/appointments/book',
    {
      doctorId,
      appointmentDate: testBookingDate,
      appointmentTime: '09:30',
      notes: 'Initial checkup consultation for integration testing',
    },
    { Cookie: patientCookie }
  );

  if (resBook.statusCode !== 302) {
    throw new Error(`Booking request failed with status ${resBook.statusCode}`);
  }
  console.log('[PASS] Appointment booked successfully! (HTTP 302 redirect to appointments)');

  // Test 11: Attempt Double Booking (Database-Level Conflict Check)
  console.log('\n11. Attempting duplicate booking for same doctor & slot (Race simulation)...');
  const resConflict = await request(
    'POST',
    '/appointments/book',
    {
      doctorId,
      appointmentDate: testBookingDate,
      appointmentTime: '09:30',
      notes: 'Second patient race-condition attempt',
    },
    {
      Cookie: patientCookie,
      Accept: 'application/json',
    }
  );

  if (resConflict.statusCode !== 409) {
    throw new Error(`Expected HTTP 409 Conflict for double booking, got ${resConflict.statusCode}`);
  }
  const conflictJson = JSON.parse(resConflict.body);
  if (!conflictJson.suggestedSlot || conflictJson.suggestedSlot.time !== '10:00') {
    throw new Error(`Next slot algorithm expected 10:00, got: ${JSON.stringify(conflictJson.suggestedSlot)}`);
  }
  console.log('[PASS] Double booking prevented at database level! HTTP 409 Conflict returned.');
  console.log(`[PASS] Server suggested next slot: ${JSON.stringify(conflictJson.suggestedSlot)}`);

  // Test 12: Doctor Views Appointment
  console.log('\n12. Doctor viewing pending appointment in schedule...');
  const bookedApt = await Appointment.findOne({ doctorId, appointmentDate: testBookingDate, appointmentTime: '09:30' });
  if (!bookedApt) throw new Error('Booked appointment was not found in MongoDB!');
  const appointmentId = bookedApt._id.toString();
  console.log(`[PASS] Found booked appointment #${appointmentId}`);

  // Test 13: Doctor Accepts Appointment
  console.log('\n13. Doctor accepts appointment...');
  const resAccept = await request('POST', `/appointments/${appointmentId}/accept`, null, { Cookie: docCookie });
  if (resAccept.statusCode !== 302) {
    throw new Error(`Accept appointment failed with status ${resAccept.statusCode}`);
  }
  const aptAccepted = await Appointment.findById(appointmentId);
  if (aptAccepted.status !== 'accepted') throw new Error(`Status was ${aptAccepted.status}, expected accepted`);
  console.log('[PASS] Appointment accepted by Doctor.');

  // Test 14: Doctor Completes Appointment
  console.log('\n14. Doctor marks appointment completed...');
  const resComplete = await request('POST', `/appointments/${appointmentId}/complete`, null, { Cookie: docCookie });
  if (resComplete.statusCode !== 302) {
    throw new Error(`Complete appointment failed with status ${resComplete.statusCode}`);
  }
  const aptCompleted = await Appointment.findById(appointmentId);
  if (aptCompleted.status !== 'completed') throw new Error(`Status was ${aptCompleted.status}, expected completed`);
  console.log('[PASS] Appointment marked completed by Doctor.');

  // Test 15: Appointment Details View
  console.log('\n15. Viewing appointment details page...');
  const resDetails = await request('GET', `/appointments/${appointmentId}`, null, { Cookie: patientCookie });
  if (resDetails.statusCode !== 200 || !resDetails.body.includes('Completed')) {
    throw new Error(`Appointment details view failed or status was not completed: ${resDetails.statusCode}`);
  }
  console.log('[PASS] Appointment details verified with Completed status badge.');

  console.log('\n16. Cleaning up temporary test records from MongoDB...');
  try {
    await Appointment.deleteMany({ _id: appointmentId });
    await DoctorProfile.deleteMany({ userId: doctorId });
    await User.deleteMany({ email: { $in: [docEmail, patientEmail] } });
    console.log('[PASS] Temporary test data cleaned up successfully (Zero residual test data).');
  } catch (cleanErr) {
    console.warn('[Warning] Could not complete DB cleanup:', cleanErr.message);
  }

  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }
  await closeDB();

  console.log('\n====================================================');
  console.log('[SUCCESS] ALL 15 END-TO-END INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runIntegrationTests().catch(async (err) => {
  console.error('\n[FAIL] INTEGRATION TEST FAILED:', err.message);
  if (testServer) {
    testServer.close();
  }
  await closeDB().catch(() => {});
  process.exit(1);
});
