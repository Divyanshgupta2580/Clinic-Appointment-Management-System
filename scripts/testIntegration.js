const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

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

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING END-TO-END HTTP INTEGRATION TESTS');
  console.log('====================================================\n');

  // Test 1: Public Home Page
  console.log('1. Testing GET / (Landing Page)...');
  const resHome = await request('GET', '/');
  if (resHome.statusCode !== 200 || !resHome.body.includes('MediPulse')) {
    throw new Error(`Landing page failed with status ${resHome.statusCode}`);
  }
  console.log('✓ Landing page responded with HTTP 200 and branded content.');

  // Test 2: Unauthenticated protection
  console.log('\n2. Testing unauthenticated access to /patient/dashboard...');
  const resUnauth = await request('GET', '/patient/dashboard');
  if (resUnauth.statusCode !== 302 || !resUnauth.headers.location?.includes('/auth/login')) {
    throw new Error(`Expected redirect to /auth/login, got status ${resUnauth.statusCode}`);
  }
  console.log('✓ Protected route correctly redirected unauthenticated request to /auth/login (HTTP 302).');

  // Test 3: Invalid Login
  console.log('\n3. Testing invalid credentials login...');
  const resBadLogin = await request('POST', '/auth/login', {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  });
  if (resBadLogin.statusCode !== 401) {
    throw new Error(`Expected 401 for bad login, got ${resBadLogin.statusCode}`);
  }
  console.log('✓ Invalid login correctly rejected with HTTP 401.');

  // Test 4: Register a Doctor
  const uniqueTag = Date.now();
  const docEmail = `dr.smith_${uniqueTag}@example.com`;
  const docName = `Sarah Smith ${uniqueTag}`;
  console.log(`\n4. Registering Doctor (${docEmail})...`);
  const resRegDoc = await request('POST', '/auth/register', {
    name: docName,
    email: docEmail,
    password: 'doctorPassword123',
    role: 'doctor',
    specialization: 'Neurology',
    qualification: 'MD, DM Neurology',
    experience: '12',
    consultationDuration: '30',
    availableStartTime: '09:00',
    availableEndTime: '17:00',
  });

  if (resRegDoc.statusCode !== 302 || !resRegDoc.headers.location?.includes('/doctor/dashboard')) {
    throw new Error(`Doctor registration failed: ${resRegDoc.statusCode} -> ${resRegDoc.headers.location}`);
  }
  const doctorCookie = extractCookie(resRegDoc.headers);
  console.log('✓ Doctor successfully registered and redirected to /doctor/dashboard.');

  // Test 5: Role Authorization - Doctor cannot access Patient Dashboard
  console.log('\n5. Testing Doctor accessing /patient/dashboard (Role Violation)...');
  const resDocAccessPatient = await request('GET', '/patient/dashboard', null, { Cookie: doctorCookie });
  if (resDocAccessPatient.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for role mismatch, got ${resDocAccessPatient.statusCode}`);
  }
  console.log('✓ Role authorization blocked Doctor from patient dashboard with HTTP 403 Forbidden.');

  // Test 6: Register a Patient
  const patientEmail = `patient_${uniqueTag}@example.com`;
  const patientName = `Alice Johnson ${uniqueTag}`;
  console.log(`\n6. Registering Patient (${patientEmail})...`);
  const resRegPat = await request('POST', '/auth/register', {
    name: patientName,
    email: patientEmail,
    password: 'patientPassword123',
    role: 'patient',
  });

  if (resRegPat.statusCode !== 302 || !resRegPat.headers.location?.includes('/patient/dashboard')) {
    throw new Error(`Patient registration failed: ${resRegPat.statusCode} -> ${resRegPat.headers.location}`);
  }
  const patientCookie = extractCookie(resRegPat.headers);
  console.log('✓ Patient successfully registered and redirected to /patient/dashboard.');

  // Test 7: Role Authorization - Patient cannot access Doctor Dashboard
  console.log('\n7. Testing Patient accessing /doctor/dashboard (Role Violation)...');
  const resPatAccessDoc = await request('GET', '/doctor/dashboard', null, { Cookie: patientCookie });
  if (resPatAccessDoc.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for role mismatch, got ${resPatAccessDoc.statusCode}`);
  }
  console.log('✓ Role authorization blocked Patient from doctor dashboard with HTTP 403 Forbidden.');

  // Test 8: Get Doctor List & Extract Doctor ID for this specific doctor
  console.log('\n8. Fetching doctors list...');
  const resDocs = await request('GET', `/patient/doctors?search=${encodeURIComponent(docName)}`, null, { Cookie: patientCookie });
  if (resDocs.statusCode !== 200 || !resDocs.body.includes(docName)) {
    throw new Error('Doctors list did not include newly registered doctor.');
  }

  // Extract doctor ID from the specific link
  const match = resDocs.body.match(/\/patient\/doctors\/([a-f0-9]{24})/);
  if (!match) throw new Error('Could not find doctor ID in HTML');
  const doctorId = match[1];
  console.log(`✓ Doctor discovered in directory. Doctor ID: ${doctorId}`);

  // Test 9: JSON API for Available Slots
  console.log('\n9. Testing JSON API /api/doctors/:id/available-slots...');
  const testBookingDate = '2026-11-20'; // A Friday
  const resSlots = await request('GET', `/api/doctors/${doctorId}/available-slots?date=${testBookingDate}`);
  if (resSlots.statusCode !== 200) {
    throw new Error(`Slots API failed with status ${resSlots.statusCode}`);
  }
  const slotsJson = JSON.parse(resSlots.body);
  if (!slotsJson.success || !slotsJson.availableSlots.includes('09:00')) {
    throw new Error('Slots API did not return expected available slots.');
  }
  console.log(`✓ Slots API returned ${slotsJson.availableSlots.length} available slots for ${testBookingDate}.`);

  // Test 10: Book Appointment
  console.log('\n10. Booking Appointment for 09:00 AM...');
  const resBook1 = await request(
    'POST',
    '/appointments/book',
    {
      doctorId,
      appointmentDate: testBookingDate,
      appointmentTime: '09:00',
      notes: 'Routine checkup',
    },
    { Cookie: patientCookie }
  );

  if (resBook1.statusCode !== 302 || !resBook1.headers.location?.includes('/patient/appointments')) {
    throw new Error(`Appointment booking failed with status ${resBook1.statusCode}`);
  }
  console.log('✓ Appointment booked successfully! (HTTP 302 redirect to appointments)');

  // Test 11: Duplicate Booking Attempt (Race Condition / Double Booking Prevention)
  console.log('\n11. Attempting DUPLICATE booking for the EXACT same doctor, date & time...');
  const resBookDuplicate = await request(
    'POST',
    '/appointments/book',
    {
      doctorId,
      appointmentDate: testBookingDate,
      appointmentTime: '09:00',
      notes: 'Second booking attempt on same slot',
    },
    { 
      Cookie: patientCookie,
      Accept: 'application/json',
    }
  );

  if (resBookDuplicate.statusCode !== 409) {
    throw new Error(`Expected HTTP 409 Conflict for double booking, got ${resBookDuplicate.statusCode}`);
  }
  const conflictJson = JSON.parse(resBookDuplicate.body);
  console.log('✓ Double booking prevented at database level! HTTP 409 Conflict returned.');
  console.log(`✓ Server suggested next slot: ${JSON.stringify(conflictJson.suggestedSlot)}`);

  // Test 12: Doctor views appointments & Accepts
  console.log('\n12. Doctor views appointments list...');
  const resDocApts = await request('GET', '/doctor/appointments', null, { Cookie: doctorCookie });
  if (resDocApts.statusCode !== 200 || !resDocApts.body.includes(patientName)) {
    throw new Error('Doctor appointments list did not show the booked patient.');
  }
  const aptMatch = resDocApts.body.match(/\/appointments\/([a-f0-9]{24})\/accept/);
  if (!aptMatch) throw new Error('Could not find accept button / appointment ID');
  const appointmentId = aptMatch[1];
  console.log(`✓ Found booked appointment #${appointmentId}`);

  console.log('\n13. Doctor accepts appointment...');
  const resAccept = await request('POST', `/appointments/${appointmentId}/accept`, null, { Cookie: doctorCookie });
  if (resAccept.statusCode !== 302) {
    throw new Error(`Accept appointment failed with status ${resAccept.statusCode}`);
  }
  console.log('✓ Appointment accepted by Doctor.');

  console.log('\n14. Doctor completes appointment...');
  const resComplete = await request('POST', `/appointments/${appointmentId}/complete`, null, { Cookie: doctorCookie });
  if (resComplete.statusCode !== 302) {
    throw new Error(`Complete appointment failed with status ${resComplete.statusCode}`);
  }
  console.log('✓ Appointment marked completed by Doctor.');

  // Test 15: Appointment Details View
  console.log('\n15. Viewing appointment details page...');
  const resDetails = await request('GET', `/appointments/${appointmentId}`, null, { Cookie: patientCookie });
  if (resDetails.statusCode !== 200 || !resDetails.body.includes('Completed')) {
    throw new Error(`Appointment details view failed or status was not completed: ${resDetails.statusCode}`);
  }
  console.log('✓ Appointment details verified with Completed status badge.');

  console.log('\n====================================================');
  console.log('🎉 ALL 15 END-TO-END INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runIntegrationTests().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  process.exit(1);
});
