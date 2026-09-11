# Testing & Quality Assurance Documentation

This document describes the automated test suites, execution commands, verified test results, and testing architecture for the MediPulse Clinic Management System.

---

## 1. Testing Philosophy & Zero Mock Data Policy

- **No Permanent Mock Data:** Tests do not rely on pre-seeded fake users or hard-coded test credentials.
- **Dynamic Scaffolding:** Any required test accounts (such as a test doctor or test patient) are created inside the test script with timestamp-based unique identifiers.
- **Automated Teardown:** Every test script cleans up all temporary records it created before exiting, guaranteeing that the database remains clean with zero residual test data.

---

## 2. Test Suite Breakdown

### 2.1. Suite 1: Slot Generation Unit Tests
- **File:** [scripts/testSlots.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/scripts/testSlots.js)
- **Command:** `node scripts/testSlots.js`
- **Scope:** Pure mathematical unit verification of time conversions, slot increments, and weekday calculation.
- **Scenarios Tested:**
  1. `timeToMinutes('09:30')` correctly calculates 570 minutes.
  2. `minutesToTime(570)` correctly formats `'09:30'`.
  3. `generateSlots('09:00', '11:00', 30)` generates `['09:00', '09:30', '10:00', '10:30']`.
  4. `generateSlots('14:00', '15:00', 15)` generates `['14:00', '14:15', '14:30', '14:45']`.
  5. `getDayOfWeek('2026-09-10')` correctly returns `'Thursday'` using UTC calendar math without local timezone shift.
- **Status:** PASSED (Verified)

---

### 2.2. Suite 2: Database Concurrency & Double-Booking Constraint Test
- **File:** [scripts/testDoubleBooking.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/scripts/testDoubleBooking.js)
- **Command:** `node scripts/testDoubleBooking.js`
- **Scope:** Verifies that MongoDB's storage engine enforces the compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` and triggers next-slot calculation.
- **Scenarios Tested:**
  1. Synchronizes indexes via Mongoose `syncIndexes()` and verifies that the compound unique index exists in the MongoDB engine.
  2. Patient 1 reserves a 10:00 AM slot → Insert succeeds.
  3. Patient 2 attempts to reserve the identical slot (simulating concurrent booking) → Caught by MongoDB engine, which throws `E11000 duplicate key error`.
  4. Invokes `findNextAvailableSlot()` for the conflicted patient → Correctly returns the doctor's next open slot at 10:30 AM.
  5. Deletes all temporary test records from MongoDB.
- **Status:** PASSED (Verified)

---

### 2.3. Suite 3: End-to-End HTTP Integration Test Suite
- **File:** [scripts/testIntegration.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/scripts/testIntegration.js)
- **Command:** `node scripts/testIntegration.js`
- **Scope:** End-to-end HTTP request testing across routes, middleware, and controllers against a live running server.
- **15 Integration Steps Verified:**
  1. `GET /` — Public landing page responds with HTTP 200 and branded content.
  2. `GET /patient/dashboard` without session — Correctly redirects to `/auth/login` (HTTP 302).
  3. `POST /auth/login` with invalid credentials — Correctly rejected with HTTP 401.
  4. `POST /auth/register` for a Doctor — Successfully creates doctor, initializes `DoctorProfile`, and redirects to `/doctor/dashboard`.
  5. Doctor accessing `/patient/dashboard` — Correctly blocked with HTTP 403 Forbidden (RBAC violation).
  6. `POST /auth/register` for a Patient — Successfully registers and redirects to `/patient/dashboard`.
  7. Patient accessing `/doctor/dashboard` — Correctly blocked with HTTP 403 Forbidden (RBAC violation).
  8. `GET /patient/doctors?search=...` — Verified doctor appears in directory.
  9. `GET /api/doctors/:id/available-slots` — Slots API returns 16 available consultation slots.
  10. `POST /appointments/book` — Patient books 09:00 AM slot; appointment created with status `pending`.
  11. `POST /appointments/book` (Duplicate Attempt) — Double booking prevented! Returns HTTP 409 Conflict with suggested next slot at 09:30 AM.
  12. `GET /doctor/appointments` — Doctor views booked patient in appointment management list.
  13. `POST /appointments/:id/accept` — Doctor accepts appointment; status updates to `accepted`.
  14. `POST /appointments/:id/complete` — Doctor marks appointment as `completed`.
  15. `GET /appointments/:id` — Appointment details verified with "Completed" status badge.
  16. Automated Cleanup — All temporary test records purged from MongoDB.
- **Status:** ALL 15 TESTS PASSED (Verified)

---

## 3. How to Run All Tests

Run all three test suites sequentially with one command:
```bash
npm test
```

### Expected Output Summary:
```
--- RUNNING SLOT UTILS UNIT TESTS ---
[PASS] Time conversion tests passed
[PASS] 30-min slot generation passed
[PASS] 15-min slot generation passed
[PASS] Day of week calculation passed
ALL UNIT TESTS PASSED SUCCESSFULLY!

====================================================
[TEST] TESTING DATABASE-LEVEL DOUBLE-BOOKING CONSTRAINT
====================================================
[PASS] Compound unique index confirmed in MongoDB engine.
[PASS] Booking 1 succeeded!
[PASS] SUCCESS: MongoDB E11000 Duplicate Key Error was correctly thrown by database engine!
[PASS] Next available slot correctly calculated as 10:30 AM!
[SUCCESS] ALL DOUBLE-BOOKING TESTS PASSED PERFECTLY!

====================================================
[TEST] RUNNING END-TO-END HTTP INTEGRATION TESTS
====================================================
1. Testing GET / (Landing Page)... [PASS]
2. Testing unauthenticated access... [PASS]
3. Testing invalid credentials login... [PASS]
4. Registering Doctor... [PASS]
5. Role authorization Doctor -> Patient... [PASS]
6. Registering Patient... [PASS]
7. Role authorization Patient -> Doctor... [PASS]
8. Fetching doctors list... [PASS]
9. Testing JSON API /api/doctors/:id/available-slots... [PASS]
10. Booking Appointment for 09:00 AM... [PASS]
11. Duplicate booking attempt -> HTTP 409 Conflict... [PASS]
12. Doctor views appointments list... [PASS]
13. Doctor accepts appointment... [PASS]
14. Doctor completes appointment... [PASS]
15. Viewing appointment details page... [PASS]
16. Cleaning up temporary test records... [PASS]
[SUCCESS] ALL 15 END-TO-END INTEGRATION TESTS PASSED!
```

---

## 4. Test Limitations

1. **Local Server Prerequisite for Integration Tests:** `scripts/testIntegration.js` runs HTTP requests against `http://127.0.0.1:3000`, requiring the Express server to be running.
2. **Database Prerequisite:** `testDoubleBooking.js` and `testIntegration.js` require an active MongoDB connection (local or Atlas).
