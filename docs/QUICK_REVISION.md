# Quick Revision Guide (10-Minute Viva Cheat Sheet)

Keep this document open for a 10-minute revision immediately before your project demonstration, college viva, or technical evaluation.

---

## 1. Project Snapshot

- **Project Name:** MediPulse Clinic Appointment Management System
- **Domain:** Healthcare Management (Doctor-Patient Scheduling)
- **Primary Stack:**
  - **Runtime:** Node.js (v20+)
  - **Web Framework:** Express.js (v4.21+)
  - **Templating / Frontend:** EJS (Server-Side Rendered) + Semantic CSS + Vanilla JS
  - **Database:** MongoDB Atlas (NoSQL)
  - **ODM:** Mongoose (v8.10+)
  - **Authentication:** `express-session` (Cookie: `medipulse.sid`)
  - **Password Security:** `bcryptjs` (Salt factor 10)
  - **Security Headers:** `helmet`
  - **Brute-Force Protection:** `express-rate-limit`

---

## 2. The One-Sentence Pitch
> *"MediPulse Clinic is an MVC-style Node.js and Express application where EJS renders the pages on the server, middleware handles authentication and authorization, controllers handle business logic, Mongoose communicates with MongoDB Atlas, and MongoDB enforces important data constraints such as preventing duplicate appointment slots."*

---

## 3. Core Architecture & Request Flow

```
Browser
  ↓ HTTP Request (GET / POST)
Express Route (in routes/)
  ↓
Middleware (requireAuth → requireRole → validateAppointment)
  ↓
Controller (in controllers/appointmentController.js)
  ↓
Mongoose Model (in models/Appointment.js)
  ↓
MongoDB Atlas (Storage Engine Unique Index Check)
  ↓
Controller (catches error 11000 if slot taken, or saves appointment)
  ↓
EJS Template Render / HTTP Redirect (with flash message)
```

---

## 4. Key Features & Highlights

### 4.1. Core Technical Highlight: Database-Level Double-Booking Prevention
- **The Problem:** Application-level `findOne()` followed by `create()` is vulnerable to race conditions when two requests arrive simultaneously.
- **The Solution:** MongoDB **compound unique index** on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`.
- **The Partial Filter:** `{ status: { $in: ['pending', 'accepted', 'completed'] } }` ensures that rejected and cancelled slots are automatically freed up for other patients while preserving historical audit records.
- **Duplicate Handling:** Catches MongoDB error code `11000`, responds with HTTP 409 Conflict, and prevents application crashes.

### 4.2. Stretch Goal Highlight: Next Available Slot Suggestion
- When a slot collision occurs, `slotUtils.findNextAvailableSlot(doctorId, date, time)`:
  1. Checks for subsequent open slots today.
  2. If none, checks doctor availability over the next 7 days.
  3. Recommends the earliest open slot to the patient.

### 4.3. WebSockets Decision (Honest Defense)
- *"We deliberately removed WebSockets and Socket.IO because healthcare appointment scheduling is inherently transactional, not a live messaging feed. Removing WebSockets eliminated unnecessary persistent TCP connection overhead and simplified the codebase to a clean, reliable, and easily explainable HTTP + SSR architecture."*

---

## 5. Important Files to Remember

| File | Purpose | Key Line to Mention |
|---|---|---|
| [server.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/server.js) | Server startup | `await connectDB(); server.listen(PORT)` |
| [app.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/app.js) | Express app setup | Middleware pipeline & session cookie config |
| [config/db.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/config/db.js) | Database connection | Connection pooling with `process.env.MONGODB_URI` |
| [models/Appointment.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/Appointment.js) | Appointment schema | Compound unique index with `partialFilterExpression` |
| [controllers/appointmentController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/appointmentController.js) | Booking logic | Direct `create()`, catching `err.code === 11000` |
| [middleware/auth.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/auth.js) | Auth & session locals | `requireAuth` and `sessionLocals` |
| [middleware/role.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/role.js) | RBAC | `requireRole('patient')`, `requireDoctorOrAdmin` |
| [utils/slotUtils.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/slotUtils.js) | Slot calculations | `generateSlots`, `findNextAvailableSlot` |

---

## 6. Important Routes to Remember

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/` | Public | Landing page |
| `POST` | `/login` | Public | Authenticates user and sets session |
| `POST` | `/register` | Public | Hashes password with bcrypt and creates user |
| `GET` | `/patient/doctors` | Patient | Browse doctors directory |
| `POST` | `/appointments/book` | Patient | Reserve a consultation slot |
| `POST` | `/appointments/:id/accept` | Doctor/Admin | Confirm a pending appointment |
| `POST` | `/appointments/:id/reject` | Doctor/Admin | Reject appointment and release slot |
| `POST` | `/appointments/:id/complete` | Doctor/Admin | Mark consultation as finished |
| `GET` | `/api/doctors/:id/available-slots` | Public | JSON API for dynamic slot picker |

---

## 7. Important Functions to Remember

- `appointmentController.bookAppointment`: Direct insert with duplicate key catch.
- `slotUtils.findNextAvailableSlot`: Traverses doctor working days and hours to find alternative slots.
- `slotUtils.generateSlots`: Splits working hours into consultation intervals (e.g. 30 minutes).
- `User.hashPassword`: Hashes plain password using bcrypt salt rounds = 10.
- `middleware/role.requireRole`: Enforces RBAC permissions.

---

## 8. Important Database Indexes to Remember

1. `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` (Unique, partial on active statuses) — Double-booking lock.
2. `{ email: 1 }` (Unique) — User account uniqueness.
3. `{ userId: 1 }` (Unique) — DoctorProfile 1-to-1 link.
4. `{ patientId: 1, appointmentDate: -1, createdAt: -1 }` — Patient history sorting & pagination.
5. `{ doctorId: 1, appointmentDate: 1, status: 1 }` — Doctor daily schedule query.

---

## 9. Top 5 Concepts to Review

1. **Race Condition / Concurrency:** Two processes attempting to modify shared state at the same time. Solved at the database engine level via compound unique index.
2. **Server-Side Rendering (SSR):** Generating complete HTML on the server using EJS before transmitting it to the browser.
3. **Session vs JWT:** Sessions allow instant revocation on the server; cookie flags (`HttpOnly`, `SameSite: Lax`) protect against XSS and CSRF.
4. **IDOR (Ownership Check):** Checking `appointment.patientId === currentUserId` on the server so malicious users cannot alter other patients' records by guessing IDs.
5. **Zero Mock Data Policy:** Tests generate temporary records with timestamps and purge them immediately upon completion.
