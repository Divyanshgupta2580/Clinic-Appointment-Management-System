# Clinic Appointment Management System (MediPulse Clinic)

A clean, robust, and secure doctor-patient appointment management platform engineered with **Node.js**, **Express.js**, **EJS (Server-Side Rendering)**, and **MongoDB Atlas** with **Mongoose ODM**.

> **Architecture in One Sentence:**  
> *"This is an MVC-style Node.js and Express application where EJS renders the pages on the server, middleware handles authentication and authorization, controllers handle business logic, Mongoose communicates with MongoDB Atlas, and MongoDB enforces important data constraints such as preventing duplicate appointment slots."*

---

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Request Lifecycle](#request-lifecycle)
- [Database Design](#database-design)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Appointment Booking](#appointment-booking)
- [Double Booking Prevention](#double-booking-prevention)
- [Next Available Slot](#next-available-slot)
- [Security](#security)
- [Performance](#performance)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Viva & Technical Highlights](#viva--technical-highlights)

---

## Overview

MediPulse Clinic is a full-featured web application designed to streamline the consultation booking workflow for small to mid-sized medical practices. Patients can discover verified doctors, view consultation hours, pick open dates, and reserve slots. Doctors and clinic administrators can manage consultation requests, approve or decline appointments, and mark consultations as completed.

The core technical priority of this codebase is **simplicity, correctness, database-enforced concurrency safety, and total explainability** for academic evaluations and technical interviews.

---

## Problem Statement

**Problem Statement 1 (PS 1) — Healthcare Domain:**  
Manage doctor-patient appointment booking for a small clinic.

In medical appointment scheduling, a frequent critical failure in naive software implementations is the **double-booking race condition**: two patients attempting to reserve the exact same doctor, date, and consultation time slot simultaneously. Most applications perform an application-level check (`findOne` followed by `create`), which fails under concurrent traffic because both requests observe the slot as open before either has written.

---

## Solution

MediPulse Clinic eliminates booking race conditions by delegating slot exclusivity directly to **MongoDB's WiredTiger storage engine** using an atomic **compound unique index** on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`.

1. **Hardware-Level Concurrency Control:** Even if two booking requests arrive at the exact same millisecond, MongoDB guarantees that exactly one succeeds and the other is rejected with duplicate key error `11000`.
2. **Partial Unique Filter:** Rejected and cancelled appointments are excluded from the uniqueness index (`partialFilterExpression`), instantly recycling the time slot for other patients while preserving clinical audit history.
3. **Smart Fallback Scheduling:** When a conflict occurs, the application catches error `11000`, returns HTTP 409 Conflict, and automatically calculates the doctor's next available opening today or over the next 7 days.
4. **Server-Side Rendered EJS:** Pages render instant semantic HTML on the server without heavy frontend JavaScript frameworks or complex client-side state managers.

---

## Features

- **Role-Based Authentication:** Dedicated dashboards and workflows for Patients, Doctors, and Administrators.
- **Doctor Directory & Search:** Browse physicians with filtering by specialty and full-text search by name.
- **Interactive Date & Slot Picker:** Progressive enhancement with vanilla JavaScript fetching real-time slot availability for a chosen date.
- **Zero Double-Booking Guarantee:** Database-level compound unique lock.
- **Next Available Slot Calculation:** Recommends alternative consultation times if a slot is taken.
- **Appointment Status Lifecycle:** Full workflow transitions (`pending` → `accepted` → `completed`, or `rejected` / `cancelled`).
- **Granular Ownership Control (Anti-IDOR):** Patients can only access their own appointments; doctors can only manage visits assigned to them.
- **Brute-Force Rate Limiting:** Prevents password guessing attacks on `/login` and `/register`.
- **Zero Mock Data Policy:** Clean development and production environment; automated tests scaffold and clean up temporary records automatically.

---

## User Roles

| Role | Access Permissions |
|---|---|
| **Patient** | Register, login, browse doctors, select consultation dates/slots, book appointments, view appointment history, cancel personal appointments. |
| **Doctor** | Manage clinical schedule (working days, start/end hours, visit duration), review assigned appointments, accept pending visits, decline visits, mark visits completed. |
| **Admin** | Clinic-wide dashboard overview, view all doctors, view all appointments across the practice, accept/reject/complete appointments. |

---

## Technology Stack

- **Runtime Environment:** [Node.js](https://nodejs.org/) (v20+ Recommended)
- **Web Framework:** [Express.js](https://expressjs.com/) (v4.21+)
- **View Engine:** [EJS](https://ejs.co/) (Embedded JavaScript Templates)
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) / Local MongoDB
- **Object Data Modeling (ODM):** [Mongoose](https://mongoosejs.com/) (v8.10+)
- **Session Management:** `express-session` (Signed cookie: `medipulse.sid`)
- **Password Hashing:** `bcryptjs` (Salt factor: 10)
- **Security Headers:** `helmet`
- **Rate Limiting:** `express-rate-limit`
- **Environment Configuration:** `dotenv`

---

## Architecture

The project strictly follows the **Model-View-Controller (MVC)** architectural design:

```
Browser (Patient / Doctor)
       │ HTTP Request (GET / POST)
       ▼
Express Route (in routes/)
       │ Sequential Execution
       ▼
Middleware Layer (requireAuth → requireRole → validateAppointment)
       │ Authorized & Validated Request
       ▼
Controller (in controllers/appointmentController.js)
       │ Business Logic & Query Construction
       ▼
Mongoose Model (in models/Appointment.js)
       │ Wire Protocol
       ▼
MongoDB Atlas (Storage Engine & Compound Unique Index Enforcement)
       │ Result / Duplicate Key (E11000)
       ▼
Controller
       │ Response Decision
       ▼
EJS Template Render / HTTP Redirect (with Session Flash message)
```

No unnecessary layers (DTOs, factories, service repositories, microservices, or WebSockets) exist in this project.

---

## Request Lifecycle

Example: Patient submits an appointment booking form:
1. **Browser** posts `doctorId`, `appointmentDate`, `appointmentTime`, and `notes` to `POST /appointments/book`.
2. **Route** in `routes/appointmentRoutes.js` captures the endpoint.
3. **Middleware Pipeline:**
   - `requireAuth` verifies active session.
   - `requireRole('patient')` confirms account role.
   - `validateAppointment` asserts valid ObjectId and regex date/time formatting.
4. **Controller:** `appointmentController.bookAppointment` runs. It queries `User.findById(doctorId)` to verify the physician exists.
5. **Model & Database:** Directly issues `Appointment.create(...)`.
6. **Unique Lock Evaluation:** MongoDB checks `{ doctorId, appointmentDate, appointmentTime }`.
   - **Success:** Record inserted with status `pending`. Controller redirects to `/patient/appointments` with success flash message.
   - **Conflict:** MongoDB throws error `11000`. Controller catches the error, calls `findNextAvailableSlot()`, and returns HTTP 409 / redirects with a suggested alternative slot.
7. **EJS:** The server renders `history.ejs` with the updated appointment list.

---

## Database Design

```
+-------------------+             +-----------------------+
|       User        |             |     DoctorProfile     |
+-------------------+             +-----------------------+
| _id (PK)          |             | _id (PK)              |
| name              |◄─── 1:1 ───►| userId (FK -> User)   |
| email (Unique)    |             | specialization        |
| passwordHash      |             | qualification         |
| role              |             | experience            |
| timestamps        |             | consultationDuration  |
+-------------------+             | availableDays         |
        │                         | availableStartTime    |
        │ 1:N (as Doctor/Patient) | availableEndTime      |
        ▼                         | timestamps            |
+---------------------------------+-----------------------+
|                           Appointment                   |
+---------------------------------------------------------+
| _id (PK)                                                |
| patientId (FK -> User)                                  |
| doctorId (FK -> User)                                   |
| appointmentDate (YYYY-MM-DD)                            |
| appointmentTime (HH:MM)                                 |
| status ('pending', 'accepted', 'rejected', 'completed', |
|         'cancelled')                                    |
| notes                                                   |
| timestamps                                              |
|                                                         |
| INDEX: { doctorId: 1, appointmentDate: 1,               |
|          appointmentTime: 1 } (UNIQUE)                  |
| PARTIAL FILTER: status in ['pending', 'accepted',       |
|                            'completed']                 |
+---------------------------------------------------------+
```

---

## Authentication

- **Session-Based:** User identity is verified via signed session cookies (`medipulse.sid`).
- **Cookie Security:** Configured with `httpOnly: true` (neutralizes XSS token theft), `sameSite: 'lax'` (CSRF protection), and `secure: true` in production (enforces HTTPS).
- **Minimal Session Data:** Only `_id`, `name`, `email`, and `role` are stored in session memory. Passwords and full documents are never stored in session state.
- **Immediate Revocation:** Logout completely destroys the server-side session and clears the browser cookie.

---

## Authorization

Granular **Role-Based Access Control (RBAC)** is enforced on all protected routes:
- `requireAuth`: Ensures user is logged in.
- `requireRole('patient')`: Restricts patient dashboards and booking forms.
- `requireDoctorOrAdmin`: Grants access to doctors or administrators.
- `requireRole('admin')`: Restricts clinic administration overview.

### Resource Ownership Checks (Anti-IDOR)
In `appointmentController.js`:
- A patient can only view or cancel appointments where `appointment.patientId === req.session.user._id`.
- A doctor can only accept, reject, or complete visits where `appointment.doctorId === req.session.user._id`.
- Attempts to tamper with route IDs return HTTP 403 Forbidden.

---

## Appointment Booking

Booking is handled through `POST /appointments/book`:
1. The patient selects a doctor and views their profile at `/patient/doctors/:id`.
2. As the patient chooses a date, `booking.js` requests available slots from `/api/doctors/:id/available-slots?date=YYYY-MM-DD`.
3. Open slots are presented as interactive buttons; occupied slots are disabled.
4. The patient submits the form with reason/notes.

---

## Double Booking Prevention

### The Technical Highlight
Instead of checking whether a slot is free and then inserting it, **MongoDB enforces uniqueness across Doctor ID, Appointment Date, and Appointment Time**:

```javascript
appointmentSchema.index(
  {
    doctorId: 1,
    appointmentDate: 1,
    appointmentTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'accepted', 'completed'] },
    },
  }
);
```

### Why Partial Filtering?
When a doctor rejects an appointment or a patient cancels, the appointment status becomes `'rejected'` or `'cancelled'`. Because the unique index only applies to `['pending', 'accepted', 'completed']`, the slot is **immediately freed for other patients** to reserve while keeping the original record for clinic auditing.

---

## Next Available Slot

When a booking collision occurs:
1. `appointmentController.js` catches `err.code === 11000`.
2. It invokes `slotUtils.findNextAvailableSlot(doctorId, requestedDate, requestedTime)`.
3. The algorithm checks remaining time slots on the requested date.
4. If the doctor has no remaining openings today, it iterates day by day for up to 7 days, checking the doctor's weekly working schedule (`availableDays`).
5. The first unbooked slot is returned and displayed to the patient with a one-click rebook recommendation.

---

## Security

- **Password Hashing:** `bcryptjs` with salt factor 10.
- **HTTP Security Headers:** `helmet` sets defensive headers (`nosniff`, `SAMEORIGIN`, `HSTS`).
- **Rate Limiting:** `authLimiter` limits `/login` and `/register` to 60 attempts per 15 minutes.
- **Input Validation:** Strict server-side regex checks on dates (`YYYY-MM-DD`), times (`HH:MM`), and email formats.
- **No Plaintext Passwords:** Never written to logs or sent to views.
- **Environment Isolation:** Secrets managed through `.env`, ignored in `.gitignore`.

---

## Performance

- **Indexed Queries:** All primary queries (emails, user IDs, appointment slots) leverage B-Tree indexes.
- **Lean Queries (`.lean()`):** Read-only controllers bypass Mongoose Document hydration, saving ~60% memory.
- **Field Selection (`.select()`):** Omits large and sensitive fields over the wire.
- **Zero N+1 Queries:** Batch-fetches doctor profiles using `$in` and enriches appointments in memory via a JavaScript `Map`.
- **Pagination:** Limits appointment lists to 8–10 records per page.
- **Connection Pooling:** Automatically pooled TCP sockets in Mongoose.

---

## Project Structure

```
Clinic-Appointment-Management-System/
├── app.js                          # Express application configuration & middleware
├── server.js                       # Server startup & database connection
├── package.json                    # Project metadata & clean dependencies
├── .env                            # Environment variables (Git-ignored)
├── .env.example                    # Template environment variables
├── .gitignore                      # Git exclusion rules
├── README.md                       # Comprehensive project documentation
│
├── config/
│   └── db.js                       # MongoDB Atlas connection manager
│
├── models/
│   ├── User.js                     # User schema (patient, doctor, admin)
│   ├── DoctorProfile.js            # Doctor clinical schedule & metadata
│   └── Appointment.js              # Appointment schema & compound unique index
│
├── controllers/
│   ├── authController.js           # Registration, login, logout logic
│   ├── patientController.js        # Patient dashboard, doctor search, history
│   ├── doctorController.js         # Doctor dashboard, appointments, schedule
│   ├── adminController.js          # Admin clinic overview
│   └── appointmentController.js    # Booking, accept, reject, complete, cancel
│
├── middleware/
│   ├── auth.js                     # requireAuth & sessionLocals
│   ├── role.js                     # RBAC requireRole & requireDoctorOrAdmin
│   ├── validation.js               # Server-side input validation
│   ├── errorHandler.js             # Centralized 404 & 500 error handlers
│   └── rateLimiter.js              # Brute-force rate limiting
│
├── routes/
│   ├── indexRoutes.js              # Landing page, clean auth URLs, slot API
│   ├── authRoutes.js               # Login, register, logout routes
│   ├── patientRoutes.js            # /patient/* routes
│   ├── doctorRoutes.js             # /doctor/* routes
│   ├── adminRoutes.js              # /admin/* routes
│   └── appointmentRoutes.js        # /appointments/* action routes
│
├── utils/
│   ├── slotUtils.js                # Slot generation & next available slot finder
│   └── asyncHandler.js             # Async error forwarding wrapper
│
├── views/                          # Server-Side Rendered EJS Templates
│   ├── index.ejs                   # Public landing page
│   ├── auth/                       # Login & register views
│   ├── patient/                    # Patient dashboard, doctor directory, history
│   ├── doctor/                     # Doctor dashboard, appointments, schedule
│   ├── admin/                      # Admin dashboard
│   ├── appointments/               # Appointment detail view
│   ├── partials/                   # Reusable components (header, footer, navbar, flash)
│   └── errors/                     # 403, 404, 500 error pages
│
├── public/                         # Static Assets
│   ├── css/styles.css              # Vanilla responsive CSS design system
│   └── js/booking.js               # Vanilla JS dynamic slot picker
│
├── scripts/                        # Automated Test Suites
│   ├── testSlots.js                # Unit tests for slot calculations
│   ├── testDoubleBooking.js        # Concurrency & duplicate index tests
│   ├── testIntegration.js          # 15-step end-to-end HTTP integration tests
│   └── testDb.js                   # Database connection diagnostic script
│
├── api/                            # Vercel Serverless Function Adapter
│   └── index.js                    # Serverless entrypoint connecting to DB & Express
├── vercel.json                     # Vercel routing and rewrite configuration
│
└── docs/                           # Evaluation & Deployment Documentation
    ├── DEPLOYMENT.md               # Step-by-step Render and Vercel deployment guide
    ├── ENVIRONMENT.md              # Complete environment variables specification
    ├── DEPLOYMENT_AUDIT.md         # Deployment readiness audit (PASS/WARNING/FAIL)
    ├── TEACHER_EXPLANATION_GUIDE.md# 25 core viva questions answered in detail
    ├── CODEBASE_GUIDE.md           # File-by-file breakdown with purposes & key lines
    ├── API_REFERENCE.md            # Complete route documentation
    ├── DATABASE.md                 # Schemas, ER diagram, and index documentation
    ├── SECURITY.md                 # Security controls, cookies, RBAC, IDOR checks
    ├── PERFORMANCE.md              # Real optimizations (lean, select, indexes)
    ├── TESTING.md                  # Test suites, commands, and verified results
    ├── QUICK_REVISION.md           # 10-minute viva revision cheat sheet
    ├── VIVA_QUESTIONS.md           # 50 comprehensive viva Q&A for examiners
    ├── REQUEST_FLOWS.md            # Step-by-step traces for 11 core workflows
    └── AUDIT_REPORT.md             # Formal architectural verification audit
```

---

## Environment Variables

Create a `.env` file in the project root:

```ini
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db
SESSION_SECRET=replace_with_a_long_random_session_secret
APP_URL=http://localhost:3000
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Divyanshgupta2580/Clinic-Appointment-Management-System.git
cd Clinic-Appointment-Management-System

# 2. Install production dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB Atlas connection string and session secret
```

---

## MongoDB Atlas Setup

1. Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a user with read and write permissions.
3. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) or your specific IP.
4. Click **Connect** → **Drivers** (Node.js) and copy the connection string.
5. Paste it into `.env` as `MONGODB_URI`, replacing `<password>` with your database user password.

---

## Running Locally

```bash
# Start the server
npm start

# Or start with live file reloading (Node v18+)
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## Testing

Run the automated 3-tier test suite with:

```bash
npm test
```

### What `npm test` Executes:
1. **Slot Calculation Unit Tests:** `node scripts/testSlots.js`
2. **Double-Booking Database Constraint Test:** `node scripts/testDoubleBooking.js`
3. **15-Step End-to-End Integration Tests:** `node scripts/testIntegration.js`

*Adheres strictly to the Zero Mock Data rule: tests scaffold temporary records with timestamps and clean them up automatically before exiting.*

---

## Deployment

The application is engineered to run seamlessly across local environments and cloud platforms without hardcoded ports or local database assumptions.

> **Primary Platform Recommendation:** **Render** is recommended as the **PRIMARY** deployment target for this application because Express + EJS Server-Side Rendering naturally thrives in Render's long-lived Node.js process environment. Vercel is supported via a serverless adapter (`api/index.js`), but in-memory sessions are ephemeral across serverless lambdas.

See the dedicated documentation:
- [docs/DEPLOYMENT.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/DEPLOYMENT.md) — Exhaustive step-by-step deployment guide & troubleshooting.
- [docs/ENVIRONMENT.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/ENVIRONMENT.md) — Complete environment variables matrix.
- [docs/DEPLOYMENT_AUDIT.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/DEPLOYMENT_AUDIT.md) — 12-point deployment audit (PASS / WARNING / FAIL).

---

### 1. Local Development

1. **Clone repository:** `git clone https://github.com/Divyanshgupta2580/Clinic-Appointment-Management-System.git`
2. **Install dependencies:** `npm install`
3. **Create local environment file:** `cp .env.example .env`
4. **Configure MongoDB Atlas:** Set `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/clinic_appointment_db` in `.env`.
5. **Configure session secret:** Set `SESSION_SECRET` with a high-entropy secret.
6. **Start application:** `npm start` (or `npm run dev` for live-reloading).
7. **Open local URL:** Navigate to `http://localhost:3000`.

---

### 2. Render Deployment (Recommended Primary)

1. **Push project to GitHub:** Ensure your latest commits are on your `main` branch.
2. **Create Render Web Service:** Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
3. **Connect repository:** Select the `Clinic-Appointment-Management-System` repository.
4. **Build command:** `npm install`
5. **Start command:** `npm start`
6. **Add environment variables:**
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your actual MongoDB Atlas connection string>`
   - `SESSION_SECRET`: `<strong random session secret>`
   - `APP_URL`: `https://<your-service-name>.onrender.com`
   *(Do NOT add `PORT`; Render assigns it dynamically to `process.env.PORT`)*.
7. **Deploy:** Click **Create Web Service** and await successful build.
8. **Verify /health:** Open `https://<your-service-name>.onrender.com/health` (should return HTTP 200 `{"status":"ok",...}`).
9. **Verify login:** Register/log in as Patient or Doctor.
10. **Verify appointment booking:** Confirm slot generation and booking persistence in MongoDB Atlas.

---

### 3. Vercel Deployment (Serverless Adaptation)

1. **Import repository:** In [Vercel Dashboard](https://vercel.com/), click **Add New...** → **Project** and import this repo.
2. **Configure project settings:** Framework Preset: `Other`, Root Directory: `./`.
3. **Configure environment variables:**
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your actual MongoDB Atlas connection string>`
   - `SESSION_SECRET`: `<strong random session secret>`
   - `APP_URL`: `https://<your-project-name>.vercel.app`
4. **Deploy:** Click **Deploy**. Vercel routes all requests via `vercel.json` to `/api/index.js`.
5. **Verify routing:** Check that the landing page renders.
6. **Verify EJS rendering:** Check that styling and layouts load properly.
7. **Verify MongoDB:** Ensure database queries connect and resolve.
8. **Verify authentication/session behavior:** *Note: In-memory sessions reset across independent lambda instances without external session storage.*
9. **Verify /health:** Check `https://<your-project-name>.vercel.app/health`.

---

### 4. Health Check Endpoint

```http
GET /health
```
- **Response:** `{"status":"ok","timestamp":"2026-09-11T10:07:19.233Z"}` (HTTP 200)
- **Access:** Unauthenticated, fast, zero database query overhead. Safe for uptime probes and deployment health verification.

---

## Limitations

- **Single Clinic Scope:** Designed for a single clinic practice rather than multi-tenant hospital networks.
- **In-Memory Sessions in Development:** Production clusters running multiple instances should back sessions with MongoDB (`connect-mongo`).
- **No External SMS/Email:** Notifications are currently delivered via in-app flash messages and status badges rather than SMS/Email gateways.

---

## Future Improvements

- Automated SMS/Email reminders via Twilio or SendGrid.
- Online payment gateway integration (Stripe / Razorpay) for advance consultation fee collection.
- Patient medical record and prescription attachment uploads (AWS S3).

---

## Viva & Technical Highlights

For project defense and viva presentations, review:
- [docs/QUICK_REVISION.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/QUICK_REVISION.md) (10-Minute Cheat Sheet)
- [docs/TEACHER_EXPLANATION_GUIDE.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/TEACHER_EXPLANATION_GUIDE.md) (25 Core Teacher Questions)
- [docs/VIVA_QUESTIONS.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/VIVA_QUESTIONS.md) (50 Comprehensive Viva Questions)
- [docs/REQUEST_FLOWS.md](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/docs/REQUEST_FLOWS.md) (11 Step-by-Step Workflows)
