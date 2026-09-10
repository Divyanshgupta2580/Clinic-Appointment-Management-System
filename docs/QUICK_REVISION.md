# 10-Minute Pre-Viva Quick Revision Cheat Sheet

Read this 10 minutes before your viva or evaluation. It contains all the core technical facts, code anchors, and key terminology in bullet-point format.

---

## 1. Project Snapshot

- **Project Title:** MediPulse Clinic Appointment Management System
- **Domain:** Healthcare (Problem Statement 1)
- **Primary Roles:** Patient, Doctor, Administrator
- **Architecture:** Model-View-Controller (MVC) with Server-Side Rendering (SSR) and WebSockets
- **Core Technology Stack:**
  - Runtime: Node.js
  - Web Framework: Express.js (v4.21.2)
  - Templating Engine: EJS (v3.1.10)
  - Database: MongoDB / MongoDB Atlas (Mongoose ODM v8.10.1)
  - Real-Time Layer: Socket.IO (v4.8.1)
  - Security: Bcrypt.js, Express-Session, Helmet, Express-Rate-Limit

---

## 2. The Big 3 Architectural Highlights

1. **Database-Level Double-Booking Prevention:**
   - **Where:** `models/Appointment.js`
   - **The Index:** `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` (Unique)
   - **The Filter:** `partialFilterExpression: { status: { $in: ['pending', 'accepted', 'completed'] } }`
   - **Why it matters:** Prevents race-condition double-booking at the hardware storage engine level. If two users click book at the exact same millisecond, MongoDB throws `E11000 duplicate key error`. The controller catches it and suggests the next opening.
2. **Room-Isolated Real-Time Notifications:**
   - **Where:** `sockets/socket.js`
   - **The Rooms:** `user:<patientId>`, `doctor:<doctorId>`, `role:admin`
   - **Why it matters:** Avoids global broadcasting; private medical alerts reach only the specific doctor and patient. Status badges in the DOM update live without page refresh.
3. **Smart Next-Available Slot Algorithm:**
   - **Where:** `utils/slotUtils.js` (`findNextAvailableSlot`)
   - **The Logic:** Scans later slots on the requested day; if none, scans up to 7 subsequent calendar days against the doctor's weekly working days.

---

## 3. Key Files & Their Exact Responsibilities

| File | Exact Purpose |
| :--- | :--- |
| `server.js` | Bootstraps HTTP server, attaches Socket.IO, connects DB, manages graceful shutdown. |
| `app.js` | Express middleware pipeline, helmet, trust proxy, session config, EJS view engine. |
| `config/db.js` | Mongoose MongoDB connection pooling with 5-second timeout. |
| `models/User.js` | User credentials, roles (`patient`, `doctor`, `admin`), bcrypt hashing. |
| `models/DoctorProfile.js` | Doctor qualifications, slot duration (15/30/45/60 min), working hours. |
| `models/Appointment.js` | Appointment records with compound unique index on active slots. |
| `controllers/appointmentController.js` | Concurrency-safe booking, catches `E11000`, accept, reject, complete, cancel. |
| `controllers/authController.js` | Login, registration (with auto doctor profile), logout session destruction. |
| `controllers/patientController.js` | Patient dashboard stats, doctor directory search, visit history. |
| `controllers/doctorController.js` | Doctor dashboard, daily consultation schedule, availability updates. |
| `utils/slotUtils.js` | Mathematical slot generator, UTC day-of-week calculator, next-slot finder. |
| `sockets/socket.js` | Server-side Socket.IO room manager and targeted event emitters. |
| `public/js/realtime.js` | Client-side WebSocket listener; flips DOM status badges and shows toasts. |
| `public/js/booking.js` | Client-side dynamic slot picker on doctor profile pages. |

---

## 4. Key Functions to Memorize

1. `Appointment.create(...)`: Direct database insertion in `appointmentController.js`.
2. `findNextAvailableSlot(doctorId, date, time)`: Calculates alternative openings in `slotUtils.js`.
3. `User.hashPassword(plain)`: Static bcrypt hasher in `models/User.js`.
4. `user.comparePassword(candidate)`: Method verifying password in `models/User.js`.
5. `generateSlots(startTime, endTime, duration)`: Mathematical slot loop in `slotUtils.js`.
6. `getDayOfWeek(dateStr)`: UTC-safe day calculation in `slotUtils.js`.
7. `requireRole(roles)`: Role-based authorization guard in `middleware/role.js`.
8. `emitAppointmentAccepted(appointment)`: Targeted socket emitter in `sockets/socket.js`.

---

## 5. Key Routes to Point Out

- `GET /`: Landing page with feature highlights.
- `POST /auth/login`: Login processing with rate limiting.
- `POST /auth/register`: Registration with doctor profile creation.
- `GET /patient/doctors`: Searchable doctor directory.
- `GET /api/doctors/:id/available-slots`: JSON API for dynamic slot picker.
- `POST /appointments/book`: Direct booking endpoint protected by unique index.
- `POST /appointments/:id/accept`: Doctor acceptance action.
- `POST /appointments/:id/complete`: Doctor completion action.
- `POST /appointments/:id/cancel`: Cancellation endpoint that frees the slot.

---

## 6. Socket.IO Event Dictionary

| Event Name | Direction | Payload Summary |
| :--- | :--- | :--- |
| `appointment:created` | Server ➔ Doctor & Admin | `{ appointmentId, patientName, date, time, status }` |
| `appointment:accepted` | Server ➔ Patient | `{ appointmentId, doctorName, date, time, status: 'accepted' }` |
| `appointment:rejected` | Server ➔ Patient | `{ appointmentId, doctorName, status: 'rejected' }` |
| `appointment:completed`| Server ➔ Patient | `{ appointmentId, doctorName, status: 'completed' }` |
| `appointment:cancelled`| Server ➔ Patient & Doctor | `{ appointmentId, date, time, status: 'cancelled' }` |

---

## 7. Automated Test Suites (All Verified & Passing)

1. `scripts/testSlots.js`: Unit tests for slot generation and UTC day calculations.
2. `scripts/testDoubleBooking.js`: Simulates concurrent race condition; confirms `E11000 duplicate key error`.
3. `scripts/testIntegration.js`: 15-step end-to-end integration test (Auth, RBAC 403, booking, 409 conflict, accept, complete).
4. `scripts/testSocket.js`: Verifies room isolation and real-time event transmission.

---

## 8. Golden Rules for Your Presentation

- **DO** point to `models/Appointment.js` lines 53–65 when asked about double booking.
- **DO** emphasize that `partialFilterExpression` allows rejected/cancelled slots to be rebooked immediately while keeping records for medical audit logs.
- **DO** explain that SSR + progressive enhancement is faster and more reliable than heavy SPA frameworks for healthcare.
- **DO NOT** claim you used JWT (you used signed sessions).
- **DO NOT** claim you used React (you used EJS).
- **DO NOT** claim you used a simple `findOne` check to stop double bookings (you used a database unique compound index).
