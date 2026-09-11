# Clinic Appointment Management System

A clean, reliable, and user-friendly web application designed to streamline doctor-patient appointment scheduling, consultation management, and clinical workflows for healthcare practices.

**LIVE DEMO:**  
[https://clinic-appointment-management-system-pu0y.onrender.com/](https://clinic-appointment-management-system-pu0y.onrender.com/)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [User Roles](#3-user-roles)
4. [Appointment Lifecycle](#4-appointment-lifecycle)
5. [Technology Stack](#5-technology-stack)
6. [Architecture](#6-architecture)
7. [Project Structure](#7-project-structure)
8. [Database Design](#8-database-design)
9. [Double-Booking Prevention](#9-double-booking-prevention)
10. [Authentication and Authorization](#10-authentication-and-authorization)
11. [Security](#11-security)
12. [Environment Variables](#12-environment-variables)
13. [Local Installation](#13-local-installation)
14. [MongoDB Atlas Setup](#14-mongodb-atlas-setup)
15. [Demo Data & Seeding](#15-demo-data--seeding)
16. [Demo Credentials](#16-demo-credentials)
17. [Deployment](#17-deployment)
18. [Health Check](#18-health-check)
19. [Testing](#19-testing)
20. [Error Handling](#20-error-handling)
21. [User Flow](#21-user-flow)
22. [Future Improvements](#22-future-improvements)

---

## 1. Project Overview

MediPulse Clinic is a comprehensive appointment scheduling platform designed to solve the common operational bottlenecks in outpatient clinics and private medical practices:
- **What the system does:** Enables patients to discover verified doctors by specialization, review clinical schedules, pick available appointment dates, and reserve consultation slots. Doctors and administrators can view real-time appointment queues, accept or decline bookings, conduct visits, and mark appointments completed.
- **Who uses it:** Patients seeking healthcare consultations, Doctors managing their daily clinical practice and patient queues, and Clinic Administrators overseeing clinical operations.
- **The problem it solves:** Naive scheduling systems suffer from scheduling friction, lack of clear status tracking, and race-condition double-bookings where two patients book the same doctor at the exact same time. MediPulse eliminates double-booking through robust database constraints while delivering a fast, responsive user interface.
- **Main workflow:** A registered patient browses verified specialists, selects an open date/time slot, and submits a booking request. The request enters a `pending` state for doctor review. The doctor reviews the request on their dashboard, confirming or declining it. Upon the patient's visit, the doctor marks the consultation `completed`.

---

## 2. Key Features

- **Patient Registration & Login:** Patients can self-register with full name, email, and password. Validation ensures unique email accounts and secure password policies.
- **Doctor & Admin Access:** Dedicated authentication routes and dashboards tailored specifically for medical providers and clinic administrators.
- **Doctor Discovery & Filtering:** Browse specialists with real-time filtering by clinical department (e.g., General Medicine, Cardiology, Pediatrics, Dermatology, Orthopedics, Neurology, ENT, Ophthalmology, Gynecology, Psychiatry) and doctor search.
- **Interactive Date & Slot Selection:** Dynamic slot picker computes doctor-specific availability for any selected working day, displaying open time slots in real time.
- **Appointment History & Status Tracking:** Patients can view all upcoming and past visits filtered by status: Pending, Confirmed, Completed, and Declined.
- **Doctor Appointment Management:** Doctors have an intuitive clinical schedule view with quick actions to confirm pending appointments, decline unsuitable requests, and mark completed visits.
- **Accept / Decline Workflow:** Doctors retain full clinical discretion over their schedule by reviewing patient consultation notes before confirming or declining visits.
- **Completed Visit Tracking:** Doctors can record completion of consultation visits, archiving the visit with clinical notes.
- **Double-Booking Prevention:** Guaranteed single-occupancy slots using compound unique constraints on `(doctorId, appointmentDate, appointmentTime)`.
- **Next Available Slot Recommendations:** If a selected consultation slot is claimed simultaneously by another patient, the system detects the conflict and automatically suggests the doctor's next open consultation time slot.

---

## 3. User Roles

The platform provides three distinct user roles governed by server-side role-based access control (RBAC):

### Patient
- Register a new patient account and log in securely.
- Browse the doctor directory and view physician profiles, qualifications, and consultation hours.
- Check real-time slot availability for any doctor on chosen consultation dates.
- Book consultation appointments with notes regarding symptoms or visit reasons.
- View personalized appointment history categorized by status.
- Cancel personal pending or confirmed appointments if their schedule changes.

### Doctor
- Log in to a dedicated medical practitioner dashboard.
- View real-time schedule metrics: total visits, pending requests, confirmed visits, and completed appointments.
- Review patient consultation notes submitted with booking requests.
- Accept (confirm) pending consultation requests.
- Decline (reject) consultation requests with reason logging.
- Mark confirmed visits as completed after the consultation has concluded.
- Filter schedule by specific date or appointment status.

### Admin
- Log in to the central administrative clinic dashboard.
- View practice-wide statistics: registered doctors, registered patients, and total appointments.
- Access the complete roster of medical specialists and doctor profiles.
- Oversee practice-wide appointment schedules and operational records.

---

## 4. Appointment Lifecycle

Every appointment moves through a structured, transparent lifecycle:

```
                  [ Patient Books Slot ]
                            │
                            ▼
                     ┌──────────────┐
                     │   PENDING    │
                     └──────┬───────┘
                            │
               ┌────────────┴────────────┐
               │                         │
     [ Doctor Confirms ]       [ Doctor Declines ]
               │                         │
               ▼                         ▼
        ┌──────────────┐          ┌──────────────┐
        │  CONFIRMED   │          │   REJECTED   │
        └──────┬───────┘          └──────────────┘
               │
      [ Visit Conducted ]
               │
               ▼
        ┌──────────────┐
        │  COMPLETED   │
        └──────────────┘
```

- **Pending:** The initial state immediately after a patient reserves a slot. The slot is temporarily locked to prevent anyone else from taking it.
- **Confirmed (`accepted`):** The doctor has reviewed the patient's note and approved the consultation.
- **Completed:** The consultation was held, and the physician marked the appointment as finished.
- **Rejected / Declined:** The doctor declined the request (e.g., medical referral outside outpatient scope, surgical emergency). The partial index immediately recycles the time slot so other patients can book it.
- **Cancelled:** The patient cancelled an upcoming pending or confirmed visit, immediately freeing the slot.

---

## 5. Technology Stack

- **Runtime Environment:** Node.js (v18+)
- **Web Application Framework:** Express.js (v4.21.2)
- **View Template Engine:** EJS (Embedded JavaScript Templates) with Server-Side Rendering (SSR)
- **Database:** MongoDB Atlas (Cloud-hosted NoSQL cluster)
- **Object Data Modeling (ODM):** Mongoose (v8.10.1)
- **Session Management:** `express-session` with secure, HTTP-only cookie configuration
- **Password Security:** `bcryptjs` (v3.0.3) for salting and hashing credentials
- **HTTP Security Headers:** `helmet` (v8.1.0)
- **Rate Limiting:** `express-rate-limit` (v7.5.0) to prevent brute-force attacks on authentication routes
- **Configuration:** `dotenv` (v17.3.1) for environment variable injection

---

## 6. Architecture

The application follows a clean **Model-View-Controller (MVC)** architectural pattern with modular middleware layers:

```
  [ Browser / HTTP Client ]
             │
             ▼
    [ Express Routing ] ──────> /auth, /patient, /doctor, /admin, /appointments
             │
             ▼
       [ Middleware ] ─────────> Helmet, Sessions, Auth Guard, Role Guard (RBAC)
             │
             ▼
      [ Controllers ] ─────────> Business logic, validation, slot calculations
             │
      ┌──────┴──────┐
      ▼             ▼
  [ Mongoose ]   [ EJS Views ]
  [  Models  ]   (Server-Side Rendered HTML)
      │             │
      ▼             ▼
 [ MongoDB Atlas ] [ Client Browser ]
```

### Layer Responsibilities:
1. **Routing (`routes/`):** Directs incoming HTTP requests to corresponding controller action methods and applies route-specific middleware.
2. **Middleware (`middleware/`):** Enforces authentication, role authorization, flash session messages, rate limiting, and error handling.
3. **Controllers (`controllers/`):** Contains application logic, validates user inputs, orchestrates database transactions, and passes data to views.
4. **Models (`models/`):** Defines Mongoose schemas, field validations, indexes, and instance helper methods.
5. **Views (`views/`):** Server-rendered EJS templates generating clean HTML with reusable layouts, navigation, and partials.
6. **Database (`config/db.js`):** Manages connection lifecycle and pool handling with MongoDB Atlas.

---

## 7. Project Structure

```
Clinic-Appointment-Management-System/
├── config/
│   └── db.js                 # MongoDB Atlas connection manager & graceful shutdown
├── controllers/
│   ├── authController.js     # User registration, login, session termination
│   ├── patientController.js  # Doctor directory, booking screens, patient dashboards
│   ├── doctorController.js   # Doctor schedules, appointment acceptance/rejection
│   ├── adminController.js    # Administrative metrics, doctor management
│   └── appointmentController.js # Booking creation, cancellation, status updates
├── middleware/
│   ├── auth.js               # ensureAuthenticated, ensureRole, sessionLocals
│   ├── errorHandler.js       # Global 404 and 500 error handlers
│   └── rateLimiter.js        # Auth rate limiting configurations
├── models/
│   ├── User.js               # User accounts (patients, doctors, admins)
│   ├── DoctorProfile.js      # Doctor credentials, specialties, working hours
│   └── Appointment.js        # Appointments & compound unique constraint index
├── routes/
│   ├── indexRoutes.js        # Home landing page route
│   ├── authRoutes.js         # Authentication routes
│   ├── patientRoutes.js      # Patient dashboard and directory routes
│   ├── doctorRoutes.js       # Doctor dashboard and schedule routes
│   ├── adminRoutes.js        # Admin management routes
│   └── appointmentRoutes.js  # Booking, status transitions, JSON slots API
├── views/
│   ├── partials/             # header, footer, navbar, alerts, statusBadge
│   ├── auth/                 # login.ejs, register.ejs
│   ├── patient/              # dashboard.ejs, doctors.ejs, doctorDetails.ejs, history.ejs
│   ├── doctor/               # dashboard.ejs, appointments.ejs
│   ├── admin/                # dashboard.ejs
│   ├── appointments/         # details.ejs
│   ├── errors/               # 404.ejs, 500.ejs
│   └── index.ejs             # Homepage landing template
├── public/
│   ├── css/
│   │   └── styles.css        # Premium dark healthcare stylesheet
│   └── js/
│       └── booking.js        # Progressive client-side date & slot selector
├── scripts/
│   ├── seed.js               # Dedicated safe idempotent database seeder
│   ├── testSlots.js          # Unit tests for time calculations & slot generation
│   ├── testDoubleBooking.js  # Concurrency & double-booking constraint test
│   └── testIntegration.js    # End-to-end integration test suite (15 scenarios)
├── app.js                    # Express application setup, middleware, and route mounting
├── server.js                 # HTTP server bootstrap, port binding, and process shutdown
├── package.json              # Project dependencies, scripts, and node engine specs
├── .env.example              # Sanitized environment variable template
└── README.md                 # Project documentation
```

---

## 8. Database Design

The database schema utilizes three relational Mongoose models hosted on MongoDB Atlas:

### 1. `User` Collection
Stores authentication credentials, profile names, and system roles.
- `name` (String, required, 2-100 chars): Full name of the user.
- `email` (String, required, unique, lowercase): Contact and login email address.
- `passwordHash` (String, required): `bcrypt`-hashed password salt and hash.
- `role` (String, enum: `['patient', 'doctor', 'admin']`, default: `'patient'`): Authorization level.
- `timestamps`: Automatic `createdAt` and `updatedAt` tracking.

### 2. `DoctorProfile` Collection
Stores professional credentials and working availability linked to a Doctor `User`.
- `userId` (ObjectId, ref: `'User'`, required, unique): 1-to-1 relationship with a Doctor User.
- `specialization` (String, required): Medical specialty (e.g., Cardiology, Pediatrics).
- `qualification` (String, required): Medical degrees (e.g., MD, MBBS, FRCS).
- `experience` (Number, required): Years of clinical practice.
- `consultationDuration` (Number, default: 30): Duration in minutes per slot (10-120 min).
- `availableDays` (Array of Strings): Days of the week the doctor conducts clinics.
- `availableStartTime` (String, format `HH:MM`, default: `'09:00'`): Daily clinic opening time.
- `availableEndTime` (String, format `HH:MM`, default: `'17:00'`): Daily clinic closing time.

### 3. `Appointment` Collection
Represents consultation bookings connecting patients and physicians.
- `patientId` (ObjectId, ref: `'User'`, required): Reference to the booked Patient.
- `doctorId` (ObjectId, ref: `'User'`, required): Reference to the attending Doctor.
- `appointmentDate` (String, format `YYYY-MM-DD`, required): Date of consultation.
- `appointmentTime` (String, format `HH:MM`, required): 24-hour time slot.
- `status` (String, enum: `['pending', 'accepted', 'rejected', 'completed', 'cancelled']`, default: `'pending'`).
- `notes` (String, max 500 chars): Patient visit notes or doctor clinical remarks.

---

## 9. Double-Booking Prevention

### The Concurrency Problem
If two patients attempt to book the same doctor at 10:00 AM on the same date simultaneously, simple application-level checks (`findOne` followed by `save`) fail due to race conditions: both requests see the slot as open before either write finishes.

### The Solution
MediPulse Clinic enforces slot exclusivity directly at the database engine level using a **compound unique index**:

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

### How It Works:
1. **Atomic Exclusivity:** Even if multiple requests hit the server at the exact same millisecond, MongoDB's unique index guarantees that only the first write succeeds.
2. **Duplicate Key Error (E11000):** The competing request immediately fails with MongoDB error code `11000`.
3. **Application Error Handling:** `appointmentController` catches error code `11000`, prevents crash, returns HTTP 409 Conflict, and displays a user-friendly alert.
4. **Partial Filter Recycle:** Using `partialFilterExpression`, rejected and cancelled appointments are excluded from the uniqueness index, instantly recycling the time slot for other patients while preserving clinical audit history.
5. **Next Available Slot:** When a collision occurs, the system scans the doctor's working schedule to compute and suggest the next available open slot.

---

## 10. Authentication and Authorization

- **Password Hashing:** Passwords are never stored in plaintext. Passwords are salted and hashed using `bcryptjs` with a cost factor of 10 (`User.hashPassword`).
- **Session Authentication:** Upon successful login, the user's ID and role are stored in an encrypted server-side session (`req.session.user`).
- **Session Security:** Cookies are configured with `httpOnly: true` (preventing XSS access) and `sameSite: 'lax'` (mitigating CSRF). In production environments, `secure: true` enforces HTTPS transmission.
- **Route Authorization (`middleware/auth.js`):**
  - `ensureAuthenticated`: Rejects unauthenticated requests and redirects to `/auth/login`.
  - `ensureRole(allowedRoles)`: Verifies the authenticated user's role, returning HTTP 403 Forbidden if unauthorized.
- **Data Ownership Checks:** Patients can only view or cancel their own appointments; doctors can only update appointments assigned to their user ID.

---

## 11. Security

- **Helmet Protection:** Injects secure HTTP headers to mitigate cross-site scripting (XSS), clickjacking (`X-Frame-Options: SAMEORIGIN`), and MIME-type sniffing (`X-Content-Type-Options: nosniff`).
- **Rate Limiting:** Protects `/auth/login` and `/auth/register` against brute-force attacks by limiting requests to 15 attempts per 15-minute window per IP.
- **Secure Sessions:** Sessions expire automatically after 24 hours with `resave: false` and `saveUninitialized: false`.
- **Environment Isolation:** Sensitive credentials (database URIs, session secrets) are isolated in environment variables.
- **Fail-Fast Configuration:** The application validates that `SESSION_SECRET` and `MONGODB_URI` exist at startup and refuses to run with insecure defaults.

---

## 12. Environment Variables

The application requires three core environment variables:

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Application environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/clinic_appointment_db` |
| `SESSION_SECRET` | Cryptographic secret for signing session cookies | 32+ character random hex or passphrase |

> **Note:**  
> - `PORT` is assigned automatically by cloud hosts (e.g., Render) or defaults to `3000` locally. Do NOT hardcode `PORT`.  
> - The application does NOT require or use `APP_URL`. Do not add `APP_URL`.

---

## 13. Local Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- A MongoDB Atlas cluster or local MongoDB instance

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Divyanshgupta2580/Clinic-Appointment-Management-System.git
   cd Clinic-Appointment-Management-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` in an editor and configure your variables:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/clinic_appointment_db
   SESSION_SECRET=super_secret_session_passphrase_here
   ```

4. **Seed realistic demo data (optional but recommended):**
   ```bash
   npm run seed
   ```

5. **Start the local development server:**
   ```bash
   npm start
   ```

6. **Access the application:**
   Open your browser and navigate to: `http://localhost:3000`

---

## 14. MongoDB Atlas Setup

1. **Create an Atlas Account & Cluster:**
   - Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - Create a free M0 cluster.
2. **Create a Database User:**
   - Go to **Database Access** → **Add New Database User**.
   - Choose Password Authentication, enter a username and strong password, and assign the `readWriteAnyDatabase` or `dbAdmin` role.
3. **Configure Network Access:**
   - Go to **Network Access** → **Add IP Address**.
   - For local development and Render deployment, add `0.0.0.0/0` (Allow Access from Anywhere).
4. **Obtain Connection String:**
   - Go to **Database** → **Connect** → **Drivers**.
   - Copy the SRV URI:
     `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db?retryWrites=true&w=majority`
   - Set this as `MONGODB_URI` in your `.env` file.

---

## 15. Demo Data & Seeding

The application provides a dedicated database seeder located at [`scripts/seed.js`](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/scripts/seed.js).

### Execution Command:
```bash
npm run seed
```

### Seeding Characteristics:
- **Explicit Execution:** The seeder is strictly manual. `npm start` will **never** automatically run the seeder.
- **Safe & Idempotent:** Re-running `npm run seed` will not duplicate records, will not wipe existing databases, and will not alter non-demo user data.
- **Records Generated:**
  - **1 Admin Account**
  - **11 Verified Doctors** with professional profiles across 10 medical specialties.
  - **8 Registered Patients** with authentic booking histories.
  - **Exactly 20 Structured Demo Appointments** showcasing the full clinical workflow.

### Appointment Status Distribution:
- **Pending:** 6 appointments
- **Confirmed (`accepted`):** 6 appointments
- **Completed:** 5 appointments
- **Rejected / Declined:** 3 appointments
- **Total:** 20 appointments

---

## 16. Demo Credentials

The following fictional demo accounts are available after running `npm run seed`:

| Role | Email Address | Password | Purpose in Demonstration |
|---|---|---|---|
| **Patient** | `patient.sarah@medipulse.demo` | `DemoPassword123!` | Demonstrates doctor search, slot picking, booking, and viewing Pending, Confirmed, Completed, and Declined appointments. |
| **Doctor** | `dr.marcus.vance@medipulse.demo` | `DemoPassword123!` | Demonstrates doctor dashboard, accepting pending requests, declining requests, and marking confirmed visits completed. |
| **Admin** | `admin@medipulse.demo` | `DemoPassword123!` | Demonstrates clinic-wide administrative overview, doctor profiles, and full appointment registry. |

---

## 17. Deployment

The system is configured for cloud deployment on **Render**:

- **Service Type:** Web Service
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** *(leave blank for repository root)*
- **Health Check Path:** `/health`
- **Port Binding:** Handled automatically via `process.env.PORT` bound to `0.0.0.0`.

### Environment Variables on Render:
- `NODE_ENV` = `production`
- `MONGODB_URI` = `mongodb+srv://...`
- `SESSION_SECRET` = `<your-secure-secret>`

**Live Deployment URL:**  
[https://clinic-appointment-management-system-pu0y.onrender.com/](https://clinic-appointment-management-system-pu0y.onrender.com/)

---

## 18. Health Check

The application exposes a public, unauthenticated health endpoint:

```http
GET /health
```

**Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-11T17:01:29.812Z"
}
```

This endpoint is utilized by Render uptime monitors and cloud probes to verify container responsiveness without triggering database load or session initialization.

---

## 19. Testing

The repository contains automated tests:

```bash
npm test
```

### Test Suite Execution:
1. **Slot Generation Unit Tests (`scripts/testSlots.js`):** Verifies 15-minute and 30-minute interval generation, day-of-week math, and boundary validations.
2. **Database Constraint Tests (`scripts/testDoubleBooking.js`):** Validates the MongoDB compound unique index by firing concurrent booking simulations and confirming that error `11000` is triggered and the next available slot is computed.
3. **End-to-End HTTP Integration Tests (`scripts/testIntegration.js`):** Tests 15 full application workflows including registration, login, doctor directory search, appointment booking, double-booking rejection, doctor acceptance, doctor completion, and role isolation (RBAC).

---

## 20. Error Handling

- **Invalid Authentication (HTTP 401):** Displayed when credentials do not match or email is not found.
- **Unauthorized Access (HTTP 403):** Rendered when a user attempts to access an endpoint outside their role (e.g., a patient accessing `/doctor/dashboard`).
- **Duplicate Booking Conflict (HTTP 409):** Catches MongoDB E11000 errors and suggests the next available opening to the patient.
- **Resource Not Found (HTTP 404):** Handled via `middleware/errorHandler.js` rendering a styled 404 page.
- **Server Faults (HTTP 500):** Catches unhandled exceptions and displays a user-friendly error screen while logging the stack trace server-side.

---

## 21. User Flow

### Patient Flow:
```
Register / Login
       │
       ▼
Find Doctors (Filter by Specialty or Name)
       │
       ▼
Select Consultation Date & Available Time Slot
       │
       ▼
Submit Booking Request (Status: Pending)
       │
       ▼
Doctor Reviews & Accepts (Status: Confirmed)
       │
       ▼
Consultation Held (Status: Completed)
```

### Doctor Flow:
```
Login with Doctor Credentials
       │
       ▼
Access Clinical Dashboard
       │
       ▼
Review Pending Consultation Queue
       │
       ├─► [ Accept ]  ──► Status changes to Confirmed
       │
       └─► [ Decline ] ──► Status changes to Declined (Slot recycled)
       │
Conduct Patient Consultation
       │
       ▼
Mark Appointment Completed
```

### Admin Flow:
```
Login with Admin Credentials
       │
       ▼
Review Clinic KPI Metrics (Total Doctors, Patients, Appointments)
       │
       ▼
Audit Practice-Wide Doctors and Appointment Registers
```

---

## 22. Future Improvements

The following items are planned for subsequent development phases:
- **Automated Email & SMS Notifications:** Integration with Twilio or SendGrid for appointment confirmation and reminder alerts.
- **Patient Teleconsultation:** Integration with WebRTC or a video provider for remote video consultations.
- **Multi-Clinic Practice Support:** Tenant-level data isolation allowing multiple independent medical centers to share the platform.
- **Electronic Health Records (EHR):** Prescription attachments, lab test reports, and downloadable PDF visit summaries.
- **Patient Rating & Feedback System:** Verified post-consultation patient reviews for attending doctors.

---

## License

This project is licensed under the ISC License.
