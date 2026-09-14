# MediPulse Clinic — Technical & Architectural Documentation

## 1. Project Overview & Problem Statement

### 1.1 Problem Statement
In traditional outpatient and small community clinics, patient scheduling frequently breaks down into two failure modes:
1. **Double-Booking & Slot Collisions:** Reliance on paper registers or basic software without atomic concurrency controls leads to overlapping appointments.
2. **Waiting Room Uncertainty:** Patients arrive on time only to sit for 45–90 minutes with zero visibility into doctor delays or their position in line. This creates frustration, crowded waiting rooms, and overburdened reception staff who spend significant time answering status queries.

### 1.2 Target Users
- **Patients:** Seeking transparent appointment booking, automated check-in upon arrival, and real-time waiting-time visibility on their mobile devices.
- **Doctors:** Seeking an unconflicted daily schedule, a clear patient queue, streamlined one-click patient calling, and the ability to broadcast delays.
- **Receptionists:** Seeking a centralized intake desk to check in scheduled patients, process walk-in arrivals, and coordinate patient flow.
- **Clinic Administrators:** Seeking governance over clinic hours, staff accounts, doctor specialties, and security audit logs.

---

## 2. Differentiating Feature: Smart Clinic Queue & Waiting-Time Engine

The central architectural innovation of MediPulse Clinic is its **Smart Clinic Queue and Waiting-Time Management System**. MediPulse Clinic is not merely an appointment-booking form; it is a live clinic flow coordinator.

### 2.1 Core Capabilities
- **Digital Check-In:** On the day of a confirmed appointment, the patient checks in via their mobile device or the front-desk terminal.
- **Sequential Token Allocation:** An atomic queue counter issues a unique token number (e.g. `#1`, `#2`, `#3`) scoped to the assigned doctor and date.
- **Dynamic Position & Waiting-Time Calculation:**
  ```text
  estimatedWaitMinutes = (patientsAhead * doctor.slotDurationMinutes) + doctorDelayMinutes
  ```
  The system recalculates estimates in real time as consultations start and conclude.
- **Physician Delay Broadcasting:** When an emergency procedure delays a doctor, the physician broadcasts an estimated delay (e.g. `+15 minutes`), which immediately updates waiting patients' screens via WebSockets.
- **Live WebSocket Propagation:** Built on Socket.IO with authenticated rooms. When a doctor calls patient `#2`, patient `#3` immediately sees their position advance to "Next in line" without manual page refreshes.
- **Clear Clinical Disclaimers:** All queue interfaces clearly state that waiting times are mathematical approximations and do not constitute emergency triage.

---

## 3. Communication Architecture: Hybrid REST & Real-Time (Socket.IO)

To prevent resource leakage, sensitive medical data exposure, and high WebSocket overhead, MediPulse Clinic employs a strict division of responsibilities:

| Channel | Responsibility | Examples |
| :--- | :--- | :--- |
| **REST / HTTP** | Deterministic CRUD, authentication, resource creation | User registration, login, doctor listing, appointment booking, cancellation, profile updates |
| **Socket.IO** | High-frequency transient state synchronization | `patient_checked_in`, `queue_updated`, `consultation_started`, `consultation_completed`, `queue_delayed` |

### 3.1 Socket.IO Room Topology
Every Socket.IO connection is authenticated via JWT during the handshake. Connections are grouped into secure rooms to prevent uncontrolled broadcasting:
- `user:<userId>`: Private events intended strictly for a specific patient (e.g. appointment status updates).
- `doctor:<doctorId>`: Updates pertinent to an individual doctor's queue and schedule.
- `clinic:<clinicId>`: Aggregate clinic metrics for receptionists and administrators.

---

## 4. End-to-End User Workflows

### 4.1 Patient Workflow
1. **Registration & Discovery:** The patient registers an account, browses the Doctor Directory, reviews doctor qualifications, consultation fees, and available hours.
2. **Booking:** Selects a doctor and date. The frontend queries `/api/doctors/:id/available-slots?date=YYYY-MM-DD`. The patient selects an available slot and confirms.
3. **Check-In:** On the day of the appointment, the patient opens the portal and checks in. The system assigns a sequential queue token.
4. **Queue Tracking:** The patient monitors their live queue token, patients ahead, and estimated wait time until called.

### 4.2 Doctor Workflow
1. **Daily Intake Review:** The doctor logs into the Doctor Console and reviews confirmed appointments and pending requests.
2. **Calling the Next Patient:** The doctor clicks "Call Next Patient". Status advances from `WAITING` to `CALLED`.
3. **In-Room Consultation:** When the patient enters, the doctor clicks "Start Consultation" (`CALLED` -> `IN_CONSULTATION`).
4. **Completion:** When the visit concludes, the doctor marks it "Completed" (`COMPLETED`). The queue engine automatically recalculates wait times for subsequent patients.

### 4.3 Receptionist Workflow
1. **Front-Desk Overview:** Displays today's incoming patient roster.
2. **Scheduled Check-In:** Greets arriving patients and checks them into the queue with a single click.
3. **Walk-In Intake:** Collects basic patient details for unscheduled patients, selects an available doctor, and immediately generates an appointment and queue token.

### 4.4 Administrator Workflow
1. **Staff Governance:** Inspects registered accounts, updates user roles (Patient, Doctor, Receptionist, Admin).
2. **Audit Oversight:** Reviews immutable records of all system actions (logins, cancellations, role changes) with IP addresses and timestamps.

---

## 5. Technical Stack & Implementation Rationale

### 5.1 Frontend Architecture
- **Framework:** Next.js 15 (App Router) & React 19 in TypeScript.
- **Server-Side Rendering (SSR):** Used on public landing pages, doctor directory, and doctor profiles. Enables fast First Contentful Paint (FCP) and SEO discoverability.
- **Client Components:** Used for interactive components (booking calendar, live queue monitor, doctor control panel, reception check-in).
- **Design System:** Custom dark charcoal palette (`#090a0f`, `#11131a`, `#181b24`) built with Vanilla CSS variables. Accessible contrast ratios, focus states, and responsive layouts.
- **Iconography:** Lucide React icons. Zero emojis across the application.

### 5.2 Backend Architecture
- **Runtime:** Node.js & Express in TypeScript.
- **Database & ODM:** MongoDB Atlas with Mongoose schemas, compound indexes, and validation rules.
- **Real-Time Gateway:** Socket.IO server with JWT handshake authentication.
- **Security Middleware:** Helmet, CORS with strict origin validation, rate limiting, and HttpOnly cookies.
- **Testing:** Jest and Supertest integration suite with real MongoDB database validation.

---

## 6. Database Schema & Index Design

The system models are defined in `backend/src/models/`:

### 6.1 Collections & Index Strategy
1. **User (`users`):**
   - Indexes: `{ email: 1 }` (unique), `{ role: 1 }`
   - Fields: `name`, `email`, `passwordHash`, `role`, `phone`, `createdAt`.
2. **DoctorProfile (`doctorprofiles`):**
   - Indexes: `{ userId: 1 }` (unique), `{ specialization: 1 }`, `{ clinicId: 1 }`
   - Fields: `userId`, `fullName`, `specialization`, `qualifications`, `experienceYears`, `consultationFee`, `roomNumber`, `workingHours`, `slotDurationMinutes`.
3. **Appointment (`appointments`):**
   - Compound Unique Index:
     ```typescript
     { doctorId: 1, appointmentDate: 1, appointmentTime: 1 }
     ```
     With `partialFilterExpression: { status: { $nin: ['CANCELLED', 'REJECTED'] } }`.
   - Fields: `patientId`, `doctorId`, `clinicId`, `appointmentDate`, `appointmentTime`, `durationMinutes`, `reason`, `status`, `queueNumber`, `checkedInAt`.
4. **QueueEntry (`queueentries`):**
   - Indexes: `{ doctorId: 1, date: 1, queueNumber: 1 }` (unique), `{ doctorId: 1, date: 1, status: 1 }`, `{ clinicId: 1, date: 1, status: 1 }`.
   - Fields: `clinicId`, `doctorId`, `appointmentId`, `patientId`, `date`, `queueNumber`, `status`, `scheduledTime`, `checkInTime`, `calledTime`, `startedTime`, `completedTime`, `priority`.
5. **Availability (`availabilities`):**
   - Index: `{ doctorId: 1, date: 1 }` (unique)
   - Fields: `doctorId`, `date`, `isAvailable`, `customHours`, `reason`.
6. **AuditLog (`auditlogs`):**
   - Indexes: `{ userId: 1 }`, `{ timestamp: 1 }`, `{ action: 1 }`.
   - Fields: `userId`, `userRole`, `action`, `resource`, `resourceId`, `details`, `ipAddress`, `timestamp`.

---

## 7. Security Architecture

1. **Password Hashing:** Bcrypt with 10 salt rounds. Plaintext passwords are never persisted or logged.
2. **Authentication:** Signed JSON Web Tokens (JWT) containing `{ id, role, email }`. Passed via HttpOnly, SameSite cookies and Bearer headers.
3. **Authorization Guards:** Centralized `authorizeRoles('doctor')`, `authorizeRoles('admin')`, etc. All sensitive patient and appointment mutations verify resource ownership.
4. **Injection Protection:** Mongoose schema sanitization blocks NoSQL query injection. Input strings are trimmed and validated.
5. **CORS Security:** Configured to accept requests exclusively from the designated `FRONTEND_URL`.
6. **Rate Limiting:** Express rate limiting prevents brute-force attempts on authentication and booking routes.
7. **Production Secrets:** Zero hardcoded secrets. Missing critical environment variables cause a fast fail during startup.

---

## 8. Render Deployment Guide

MediPulse Clinic is designed for independent deployment as two Render Web Services:

### Backend Web Service
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Host Binding:** Express binds to `0.0.0.0` and uses `process.env.PORT`.
- **Health Check Path:** `/health`
- **Environment Variables:**
  - `NODE_ENV=production`
  - `MONGODB_URI=<MongoDB Atlas connection string>`
  - `SESSION_SECRET=<64-char random hex string>`
  - `FRONTEND_URL=<URL of deployed frontend>`

### Frontend Web Service
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=<URL of deployed backend>`
  - `NEXT_PUBLIC_SOCKET_URL=<URL of deployed backend>`

---

## 9. Architectural Decisions & Interview FAQs

### Why Retain Node.js / Express instead of Django?
- **Real-Time Integration:** Socket.IO integrates natively with the Node.js event loop without requiring separate ASGI workers, Daphne/Uvicorn configurations, or Redis channels for basic in-process room routing.
- **Type Sharing:** TypeScript across both frontend and backend provides end-to-end type consistency across data models.
- **Asynchronous Concurrency:** Node.js excels at I/O-heavy operations like booking requests, queue polling, and socket events.

### Why Avoid Firebase for the Core Database?
- **Relational Integrity & Compound Uniqueness:** MongoDB Atlas with Mongoose allows partial unique compound indexes (`{ doctorId, date, time }`) to prevent double-booking at the database engine level. Implementing strict atomic slot exclusivity in client-driven Firebase Firestore requires complex distributed transaction locks.
- **Data Sovereignty & Portability:** Self-contained Express + MongoDB services can be deployed to any cloud provider (Render, AWS, DigitalOcean) without vendor lock-in.

### How to Explain the Project in an Interview
> "MediPulse Clinic is an outpatient management platform designed to solve the two biggest operational problems in small clinics: appointment collisions and waiting room uncertainty. 
> 
> Technically, I separated the system into an Express/TypeScript REST and Socket.IO real-time backend and a Next.js App Router frontend with SSR. To guarantee zero double-booking under concurrent traffic, I engineered a compound unique index in MongoDB Atlas with a partial filter expression. For the queue engine, I implemented digital check-in with dynamic wait-time estimation based on active physician pacing, broadcasting live position updates over authenticated WebSocket rooms. The entire application is backed by automated integration tests and deployed on Render."

---

## 10. Known Limitations & Future Roadmap

### Current Scope & Known Limitations
- The queue estimation engine currently uses an arithmetic model based on standard doctor slot duration and active delays. It does not yet perform machine-learning regression on multi-week historical consultation times.
- SMS/Email notifications (Twilio / SendGrid) require external API credentials and are stubbed via in-app Socket.IO alerts and audit logs.

### Future Roadmap
- Predictive ML-based consultation duration forecasting.
- Integration with FHIR/HL7 standard electronic health records.
- Multi-branch clinic support with tenant-isolated sub-databases.
