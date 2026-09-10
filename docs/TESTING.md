# Testing & Verification Guide: MediPulse Clinic

This document details the automated test suites, manual smoke testing procedures, assertion validations, and testing architecture of MediPulse Clinic.

---

## 1. Automated Test Suite Execution

The application comes with an automated testing pipeline configured in `package.json`:

```bash
npm test
```

This runs four standalone verification suites in sequence:
1. `node scripts/testSlots.js`
2. `node scripts/testDoubleBooking.js`
3. `node scripts/testIntegration.js`
4. `node scripts/testSocket.js`

---

## 2. Test Suite Breakdown

### 2.1 Suite 1: Slot Calculation Unit Tests (`scripts/testSlots.js`)
- **Execution Mode:** Offline (pure algorithm math, no database required).
- **Target Functions:** `timeToMinutes`, `minutesToTime`, `generateSlots`, `getDayOfWeek` in `utils/slotUtils.js`.
- **Assertions:**
  1. `timeToMinutes('09:30') === 570`
  2. `minutesToTime(570) === '09:30'`
  3. `generateSlots('09:00', '11:00', 30)` returns exactly `['09:00', '09:30', '10:00', '10:30']`.
  4. `generateSlots('14:00', '15:00', 15)` returns exactly `['14:00', '14:15', '14:30', '14:45']`.
  5. `getDayOfWeek('2026-09-10') === 'Thursday'` (UTC timezone check).
- **Result:** **PASSED (4/4 tests)**

---

### 2.2 Suite 2: Double-Booking & Concurrency Test (`scripts/testDoubleBooking.js`)
- **Execution Mode:** Database connected (`MONGODB_URI`).
- **Target Invariant:** MongoDB Compound Unique Index `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`.
- **Test Workflow:**
  1. Connects to database and triggers `Appointment.syncIndexes()`.
  2. Validates index existence and uniqueness flags in the WiredTiger metadata.
  3. Creates temporary test doctor and patient IDs.
  4. Books slot `2026-10-15` at `10:00 AM` (Succeeds).
  5. Fires a duplicate booking attempt for the exact same slot (Simulated race condition).
  6. **Catches `MongoServerError: E11000 duplicate key error`**.
  7. Invokes `findNextAvailableSlot(testDoctorId, '2026-10-15', '10:00')`.
  8. Verifies that the suggested next slot is `10:30 AM`.
  9. Cleans up all temporary records.
- **Result:** **PASSED**

---

### 2.3 Suite 3: 15-Step End-to-End HTTP Integration Test (`scripts/testIntegration.js`)
- **Execution Mode:** Full HTTP request pipeline against running server on `http://127.0.0.1:3000`.
- **Steps Verified:**
  1. `GET /` -> Returns HTTP 200 with branded landing page content.
  2. `GET /patient/dashboard` (unauthenticated) -> Redirects to `/auth/login` (HTTP 302).
  3. `POST /auth/login` (invalid credentials) -> Returns HTTP 401 Unauthorized.
  4. `POST /auth/register` (Doctor) -> Creates doctor account, sets session, redirects to `/doctor/dashboard` (HTTP 302).
  5. `GET /patient/dashboard` (as Doctor) -> Blocked by RBAC with **HTTP 403 Forbidden**.
  6. `POST /auth/register` (Patient) -> Creates patient account, sets session, redirects to `/patient/dashboard` (HTTP 302).
  7. `GET /doctor/dashboard` (as Patient) -> Blocked by RBAC with **HTTP 403 Forbidden**.
  8. `GET /patient/doctors?search=...` -> Finds registered doctor in the directory.
  9. `GET /api/doctors/:id/available-slots` -> Returns available slot array.
  10. `POST /appointments/book` -> Books 09:00 AM slot, redirects to `/patient/appointments` (HTTP 302).
  11. `POST /appointments/book` (Duplicate on same slot) -> Returns **HTTP 409 Conflict** with JSON payload containing `suggestedSlot`.
  12. `GET /doctor/appointments` (as Doctor) -> Displays booked patient in list.
  13. `POST /appointments/:id/accept` -> Updates status to `accepted` (HTTP 302).
  14. `POST /appointments/:id/complete` -> Updates status to `completed` (HTTP 302).
  15. `GET /appointments/:id` -> Verifies appointment detail page with "Completed" status badge.
- **Result:** **PASSED (15/15 steps)**

---

### 2.4 Suite 4: Socket.IO Real-Time & Room Isolation Test (`scripts/testSocket.js`)
- **Execution Mode:** WebSocket connections via `socket.io-client`.
- **Target Invariant:** Room isolation and event propagation.
- **Test Workflow:**
  1. Registers doctor and patient accounts via HTTP.
  2. Connects three distinct WebSocket clients:
     - Doctor Client (joins `doctor:<doctorId>`)
     - Patient Client (joins `user:<patientId>`)
     - Stranger Client (joins `user:<strangerId>`)
  3. Patient books appointment via HTTP -> Doctor client receives `appointment:created`. Stranger client receives **nothing**.
  4. Doctor accepts appointment via HTTP -> Patient client receives `appointment:accepted`.
  5. Doctor completes appointment via HTTP -> Patient client receives `appointment:completed`.
  6. Cleans up client connections.
- **Result:** **PASSED**

---

## 3. Manual Smoke Testing Script for Evaluators

| Step | Action | Expected Visual Result |
| :--- | :--- | :--- |
| **1. Register Doctor** | Visit `/register`, select "Doctor", enter name, email, credentials, and schedule (09:00 to 17:00). | Lands on Doctor Dashboard with 0 pending visits. |
| **2. Register Patient** | Open an incognito browser window, visit `/register`, select "Patient", submit form. | Lands on Patient Dashboard. |
| **3. Browse & Select** | Click "Find Doctors", select the newly registered doctor, click "Book". | Doctor profile displays qualifications and schedule. |
| **4. Choose Slot** | Select a weekday date (e.g. tomorrow). Click an available green time slot button. | Slot button highlights in purple; "Confirm & Book" enables. |
| **5. Submit Booking** | Click "Confirm & Book Appointment". | Redirected to "My Appointments" with status "Pending Review". |
| **6. Doctor Screen** | Switch back to Doctor window. | A real-time toast alert pops up saying "New Appointment Booked!" without page refresh. |
| **7. Doctor Accepts** | Go to "Appointments" on Doctor window, click "Accept". | Status updates to "Confirmed / Accepted". |
| **8. Patient Screen** | Observe Patient window. | Status badge automatically flips to green "Confirmed / Accepted" in real time. |
| **9. Attempt Duplicate** | Open a 3rd incognito window as a different patient and try booking the exact same doctor/date/time. | Form displays conflict warning and highlights the next available opening with a direct 1-click booking link. |
