const ioClient = require('socket.io-client');
const http = require('http');

const SOCKET_URL = 'http://127.0.0.1:3000';

async function testWebSocketRooms() {
  console.log('====================================================');
  console.log('🧪 TESTING REAL-TIME SOCKET.IO EVENT & ROOM TARGETING');
  console.log('====================================================\n');
  // Register Doctor & Patient dynamically to test real live server sockets
  console.log('\n4. Setting up Doctor & Patient via HTTP on the server...');
  const uniqueTag = Date.now();
  const docEmail = `sock_doc_${uniqueTag}@example.com`;
  const docName = `Dr. Socket ${uniqueTag}`;

  // Helper request
  function postRequest(path, data, cookie = null) {
    return new Promise((resolve, reject) => {
      const payload = new URLSearchParams(data).toString();
      const req = http.request(
        `http://127.0.0.1:3000${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(payload),
            ...(cookie ? { Cookie: cookie } : {}),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  function getRequest(path, cookie = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:3000${path}`,
        {
          method: 'GET',
          headers: cookie ? { Cookie: cookie } : {},
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  // Register Doctor
  const resDoc = await postRequest('/auth/register', {
    name: docName,
    email: docEmail,
    password: 'password123',
    role: 'doctor',
    specialization: 'Pediatrics',
    qualification: 'MD',
    experience: '8',
  });
  const docCookie = resDoc.headers['set-cookie'][0].split(';')[0];

  // Register Patient
  const patEmail = `sock_pat_${uniqueTag}@example.com`;
  const resPat = await postRequest('/auth/register', {
    name: `Patient ${uniqueTag}`,
    email: patEmail,
    password: 'password123',
    role: 'patient',
  });
  const patCookie = resPat.headers['set-cookie'][0].split(';')[0];

  // Get Doctor ID from directory
  const resDocs = await getRequest(`/patient/doctors?search=${encodeURIComponent(docName)}`, patCookie);
  const match = resDocs.body.match(/\/patient\/doctors\/([a-f0-9]{24})/);
  if (!match) throw new Error('Could not find doctor ID');
  const doctorId = match[1];

  // Extract patient ID from session
  const resDashboard = await getRequest('/patient/dashboard', patCookie);
  const patIdMatch = resDashboard.body.match(/window\.CURRENT_USER\s*=\s*\{\s*id:\s*"([a-f0-9]{24})"/);
  const patientId = patIdMatch ? patIdMatch[1] : '660000000000000000000002';

  console.log(`✓ Doctor ID: ${doctorId}, Patient ID: ${patientId}`);

  // 1. Connect Doctor Socket
  console.log('5. Connecting Doctor socket client with auth...');
  const doctorSocket = ioClient(SOCKET_URL, {
    auth: { userId: doctorId, role: 'doctor' },
    transports: ['websocket'],
  });

  // 2. Connect Patient Socket
  console.log('6. Connecting Patient socket client with auth...');
  const patientSocket = ioClient(SOCKET_URL, {
    auth: { userId: patientId, role: 'patient' },
    transports: ['websocket'],
  });

  // 3. Connect Stranger Socket
  const strangerSocket = ioClient(SOCKET_URL, {
    auth: { userId: '660000000000000000000099', role: 'patient' },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve) => doctorSocket.on('connect', resolve)),
    new Promise((resolve) => patientSocket.on('connect', resolve)),
    new Promise((resolve) => strangerSocket.on('connect', resolve)),
  ]);
  console.log('✓ All 3 test clients connected to Socket.IO server.');

  // Test Event 1: appointment:created
  console.log('\n7. Patient books appointment via HTTP -> Doctor receives appointment:created...');
  let strangerReceivedCreated = false;
  strangerSocket.on('appointment:created', () => {
    strangerReceivedCreated = true;
  });

  const createdPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for appointment:created on Doctor socket')), 5000);
    doctorSocket.on('appointment:created', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  const testBookingDate = '2026-11-20';
  await postRequest(
    '/appointments/book',
    {
      doctorId,
      appointmentDate: testBookingDate,
      appointmentTime: '11:00',
      notes: 'Real-time test booking',
    },
    patCookie
  );

  const createdData = await createdPromise;
  console.log(`✓ Doctor received live appointment:created notification: "${createdData.message}"`);

  await new Promise((r) => setTimeout(r, 400));
  if (strangerReceivedCreated) {
    throw new Error('Stranger incorrectly received doctor notification!');
  }
  console.log('✓ Stranger socket did NOT receive notification (Room isolation verified).');

  // Test Event 2: appointment:accepted
  console.log('\n8. Doctor accepts appointment -> Patient receives appointment:accepted...');
  const resDocApts = await getRequest('/doctor/appointments', docCookie);
  const aptMatch = resDocApts.body.match(/\/appointments\/([a-f0-9]{24})\/accept/);
  if (!aptMatch) throw new Error('Could not find accept button in doctor appointments');
  const appointmentId = aptMatch[1];

  const acceptedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for appointment:accepted on Patient socket')), 5000);
    patientSocket.on('appointment:accepted', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  await postRequest(`/appointments/${appointmentId}/accept`, {}, docCookie);

  const acceptedData = await acceptedPromise;
  console.log(`✓ Patient received live appointment:accepted notification: "${acceptedData.message}"`);

  // Test Event 3: appointment:completed
  console.log('\n9. Doctor completes appointment -> Patient receives appointment:completed...');
  const completedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for appointment:completed on Patient socket')), 5000);
    patientSocket.on('appointment:completed', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  await postRequest(`/appointments/${appointmentId}/complete`, {}, docCookie);

  const completedData = await completedPromise;
  console.log(`✓ Patient received live appointment:completed notification: "${completedData.message}"`);

  // Cleanup
  doctorSocket.disconnect();
  patientSocket.disconnect();
  strangerSocket.disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL SOCKET.IO REAL-TIME EVENT TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

testWebSocketRooms().catch((err) => {
  console.error('\n❌ SOCKET TEST FAILED:', err.message);
  process.exit(1);
});
