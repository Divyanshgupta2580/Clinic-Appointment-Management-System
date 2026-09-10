# MediPulse Clinic Appointment Management System

> **A real-time, concurrency-safe doctor-patient appointment booking platform engineered for clinics, built with server-side rendered EJS, Node.js/Express, MongoDB Atlas, and targeted Socket.IO event streams.**

---

## 1. Project Title
**MediPulse Clinic Appointment Management System**

## 2. Project Tagline
*Streamlining outpatient scheduling with zero race conditions, intelligent slot suggestion, and instantaneous real-time updates.*

---

## 3. Problem Statement (PS 1)
**Healthcare Domain — Problem Statement 1:** Manage doctor-patient appointment booking for a small clinic.

In busy outpatient clinics, appointment scheduling commonly suffers from:
- **Double-booking conflicts** caused by simultaneous booking attempts on popular time slots.
- **Outdated availability views** where patients choose slots that have already been allocated.
- **Communication latency** between doctors accepting/declining requests and patients knowing the outcome.
- **Unreliable "check-then-insert" logic** in web backends that collapses under concurrent traffic.

## 4. Problem Overview
Traditional small clinic management relies on manual registers, asynchronous phone confirmations, or naive web portals. When two patients open the same doctor's schedule simultaneously, conventional application-level checks (`find({ doctorId, date, time }) -> if none, create()`) fail because concurrent threads pass the read validation before either writes to the database. This leads to conflicting appointments, patient dissatisfaction, and clinic administrative overhead.

## 5. Proposed Solution
MediPulse solves these challenges through an end-to-end web architecture:
1. **Guaranteed Race-Condition Prevention**: Enforces a MongoDB compound unique index (`doctorId + appointmentDate + appointmentTime`) directly in the database engine, rendering double-booking mathematically impossible even under high concurrency.
2. **Next Available Slot Stretch Goal**: When a patient attempts to reserve a slot that has just been claimed, the backend detects the duplicate-key error (code 11000) and immediately calculates the next closest opening (later that day or across the upcoming 7 days), offering a one-click re-booking alternative.
3. **Targeted Real-Time WebSocket Streaming**: Emits targeted events across isolated user and role rooms (`doctor:{id}`, `user:{id}`, `role:admin`), notifying doctors instantly when patients book, and notifying patients the second their appointment is accepted, rejected, or completed.
4. **Server-Side Rendered Performance**: Utilizes Express and EJS with partial templates, avoiding client-side framework bloat while providing a responsive desktop and mobile experience.

---

## 6. Key Features
- **Role-Based Authentication**: Secure session-based auth with bcryptjs password hashing and role segregation (`patient`, `doctor`, `admin`).
- **Doctor Directory & Profiles**: Patient browsing with search, specialization filtering, credentials, years of experience, and working hours.
- **Dynamic Slot Picker**: Interactive date/time picker that queries working days, consultation duration, and live occupied slots.
- **Zero Double-Booking Guarantee**: Hardware-level atomic locking via MongoDB compound unique index.
- **Automated Next Slot Recommendation**: Intelligently recommends the next chronologically available slot upon scheduling conflicts.
- **Appointment Lifecycle Management**: Linear status transitions (`pending` → `accepted` → `completed` or `rejected` / `cancelled`).
- **Targeted Live Alerts**: Socket.IO toasts and dynamic DOM badge updates without mandatory full-page reloads.
- **Appointment History & Pagination**: Paginated, filterable appointment audit trail with doctor and patient details.
- **Production Defense in Depth**: Helmet security headers, rate-limiting on authentication endpoints, strict server-side validation, and centralized error handling.

---

## 7. User Roles & Permissions

| Role | Access Permissions |
| :--- | :--- |
| **Patient** | Register, Login, Browse doctor directory, View doctor credentials and availability, Select date and slot, Book appointment, View own appointment history, View appointment details, Cancel own pending/accepted appointment, Receive live status notifications, Logout. |
| **Doctor** | Login, View doctor dashboard & statistics, View assigned appointments, Filter appointments by date and status, Accept pending appointments, Decline pending appointments, Mark accepted appointments completed, Update consultation duration/schedule/specialization, Receive live booking alerts, Logout. |
| **Admin** | Login, View clinic-wide analytics and all appointments, Supervise appointment states across all doctors, Access system logs, Logout. |

---

## 8. Technology Stack

- **Backend Runtime**: Node.js (v18+)
- **Application Framework**: Express.js (v4.21)
- **View Engine**: EJS (Server-Side Rendering)
- **Database**: MongoDB Atlas / MongoDB Server (v7.0+)
- **Object Data Modeling (ODM)**: Mongoose (v8.10)
- **Real-Time Communication**: Socket.IO (v4.8)
- **Authentication & Security**: `express-session`, `bcryptjs`, `helmet`, `express-rate-limit`
- **Environment Management**: `dotenv`
- **Frontend Styling**: Vanilla CSS3 (Custom Responsive Medical Design System, Glassmorphism, CSS Grid & Flexbox)

---

## 9. Architecture

```
                                  +-----------------------------+
                                  |     Web Browser (Client)    |
                                  |  HTML5 / EJS / Vanilla JS   |
                                  +--------------+--------------+
                                         |               ^
                         HTTP POST / GET |               | WebSocket (Socket.IO)
                         Session Cookies |               | Live Event Stream
                                         v               |
                         +-------------------------------+--------------+
                         |           Node.js + Express Server           |
                         |  +----------------------------------------+  |
                         |  | Security Middleware (Helmet, RateLimit)|  |
                         |  +----------------------------------------+  |
                         |  | Session & Role Authorization (RBAC)    |  |
                         |  +----------------------------------------+  |
                         |  | Controllers & Slot Calculation Engine  |  |
                         |  +----------------------------------------+  |
                         |  | Socket.IO Server (Rooms: user, doctor) |  |
                         |  +----------------------------------------+  |
                         +-----------------------+----------------------+
                                                 |
                                        Mongoose ODM Queries
                                                 |
                                                 v
                         +----------------------------------------------+
                         |             MongoDB Database Engine          |
                         |   - Compound Unique Index (No Race Cond.)    |
                         |   - Collections: Users, Profiles, Appts      |
                         +----------------------------------------------+
```

### Architectural Principles:
1. **MongoDB is the Single Source of Truth**: All state transitions, validation, and appointments are persisted and committed to MongoDB first.
2. **Socket.IO is the Ephemeral Real-Time Layer**: Sockets never commit data or act as a data store. They strictly broadcast targeted state changes after confirmed database writes.
3. **Server-Side Rendered (SSR) Simplicity**: Renders all initial views on the server with clean EJS partials, ensuring search engine crawlability, zero client bundle compile times, and fast initial page loads.

---

## 10. System Workflow

```
[ Patient / Doctor ]
        |
        v
+-------------------+       Unauthenticated       +-------------------+
|  Protected Route  | --------------------------> |   /auth/login     |
+---------+---------+                             +-------------------+
          | Authenticated
          v
+-------------------+       Unauthorized Role     +-------------------+
| Role Verification | --------------------------> |   403 Forbidden   |
+---------+---------+                             +-------------------+
          | Authorized
          v
+---------------------------------------------------------------------+
| Patient: /patient/doctors -> /patient/doctors/:id -> Slot Selection |
| Doctor:  /doctor/dashboard -> /doctor/appointments -> Actions       |
+---------------------------------------------------------------------+
```

---

## 11. Patient Workflow
1. **Registration/Login**: Patient registers with name, email, password (`role: patient`).
2. **Browse Directory**: Navigates to `/patient/doctors`, filters by medical specialization (Cardiology, Dermatology, etc.) or doctor name.
3. **Select Doctor**: Clicks "Book Appointment" to open doctor profile and schedule view.
4. **Choose Slot**: Picks a calendar date; client dynamically queries `/api/doctors/:id/available-slots?date=...` to display unoccupied slots.
5. **Confirm Booking**: Submits booking form (`doctorId`, `appointmentDate`, `appointmentTime`, `notes`).
6. **Double-Booking Shield**: If slot is open, booking succeeds. If another patient claimed it milliseconds earlier, system catches code 11000 and suggests the next available slot.
7. **Real-Time Notification**: Patient receives live toast alerts and badge updates when the doctor accepts, declines, or completes the visit.
8. **History Audit**: Patient can view all past and upcoming visits at `/patient/appointments`.

---

## 12. Doctor / Admin Workflow
1. **Doctor Login**: Doctor logs into `/auth/login` and is redirected to `/doctor/dashboard`.
2. **Live Appointment Feed**: As soon as a patient books, Socket.IO broadcasts `appointment:created` directly into the doctor's room.
3. **Review Appointments**: Doctor opens `/doctor/appointments`, reviews patient name, date, time slot, and patient notes.
4. **Accept / Reject**:
   - **Accept**: Moves status to `accepted`. Notifies patient instantly.
   - **Reject**: Moves status to `rejected`. Frees the slot in the database partial filter index so others can book it.
5. **Complete Consultation**: After medical consultation, doctor clicks "Complete", marking the record `completed`.

---

## 13. Database Architecture & Collections

### Primary Collections:
1. `users` — Authentication credentials and system roles.
2. `doctorprofiles` — Professional clinic metadata and working schedules.
3. `appointments` — Appointment records, timestamps, and status flags.

---

## 14. Database Models

### User Model (`models/User.js`)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | MongoDB Unique Identifier |
| `name` | String | Required, Trimmed (2-100 chars) | Full Name |
| `email` | String | Required, Unique, Lowercase, Trimmed | Unique Email Address |
| `passwordHash` | String | Required | Bcrypt Salted Hash (10 rounds) |
| `role` | String | Enum: `['patient', 'doctor', 'admin']` | Access Control Role |
| `createdAt` | Date | Timestamp | Record creation timestamp |
| `updatedAt` | Date | Timestamp | Record update timestamp |

### DoctorProfile Model (`models/DoctorProfile.js`)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Profile Unique Identifier |
| `userId` | ObjectId | Ref: `User`, Required, Unique, Indexed | Reference to Doctor User Document |
| `specialization` | String | Required, Trimmed, Indexed | e.g. Cardiology, Pediatrics |
| `qualification` | String | Required, Trimmed | e.g. MBBS, MD, FRCS |
| `experience` | Number | Required, Min: 0 | Years in active practice |
| `consultationDuration` | Number | Default: 30 (10-120 min) | Slot duration in minutes |
| `availableDays` | [String] | Default: Mon-Fri | Working days of the week |
| `availableStartTime` | String | Format: `HH:MM` (Default: 09:00) | Clinic opening hour |
| `availableEndTime` | String | Format: `HH:MM` (Default: 17:00) | Clinic closing hour |
| `createdAt` / `updatedAt`| Date | Timestamps | Profile lifecycle timestamps |

### Appointment Model (`models/Appointment.js`)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Appointment Unique Identifier |
| `patientId` | ObjectId | Ref: `User`, Required, Indexed | Reference to Patient User Document |
| `doctorId` | ObjectId | Ref: `User`, Required, Indexed | Reference to Doctor User Document |
| `appointmentDate` | String | Required, Match: `YYYY-MM-DD` | Date of Consultation (Timezone-agnostic) |
| `appointmentTime` | String | Required, Match: `HH:MM` | Time slot in 24-hour clock |
| `status` | String | Enum: `['pending', 'accepted', 'rejected', 'completed', 'cancelled']` | Current status (Default: `pending`) |
| `notes` | String | Maxlength: 500, Trimmed | Patient symptoms / reason for visit |
| `createdAt` / `updatedAt`| Date | Timestamps | Booking lifecycle timestamps |

---

## 15. Double-Booking Prevention Strategy

### Why "Check-Then-Insert" Fails:
A standard application check:
```javascript
// UNSAFE: VULNERABLE TO RACE CONDITIONS
const existing = await Appointment.findOne({ doctorId, date, time });
if (!existing) {
  await Appointment.create({ doctorId, date, time });
}
```
If Patient A and Patient B submit requests for the same slot at the same millisecond:
1. Thread A reads database: slot is free.
2. Thread B reads database: slot is free.
3. Thread A executes insert: slot booked.
4. Thread B executes insert: slot booked again.
**Result: Double-booking occurs.**

### MediPulse Database-Level Enforcement:
MediPulse enforces slot uniqueness using a MongoDB **Compound Unique Partial Index**:
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

### Why Partial Filter Expression?
- **Active Reservations Protected**: As long as an appointment is `pending`, `accepted`, or `completed`, the compound index forbids any second record for that doctor, date, and time.
- **Cancelled / Declined Slots Freed**: If a doctor declines (`rejected`) or a patient cancels (`cancelled`), the slot automatically ceases to match the partial index criteria and is immediately bookable by other patients without manual deletion.
- **Graceful Conflict Handling**: When code 11000 is intercepted, the user receives an alert: *"The selected appointment slot was just booked by another patient and is no longer available"* alongside an automatic recommendation for the next available slot.

---

## 16. Socket.IO Architecture & Room Topology

Socket.IO operates directly on the same Node.js HTTP server instance as Express (`server.js`).

### Room Design:
- **Patient Personal Room**: `user:{patientId}` — Receives updates specific to the patient's bookings (`appointment:accepted`, `appointment:rejected`, `appointment:completed`, `appointment:cancelled`).
- **Doctor Consultation Room**: `doctor:{doctorId}` — Receives alerts when patients book consultations with them (`appointment:created`).
- **Administrative Room**: `role:admin` — Receives all clinic-wide appointment events.

No broadcasts are sent globally to unconnected or unrelated users.

---

## 17. Real-Time Event Flow

| Action | Emitted Event | Target Room | Client Reaction |
| :--- | :--- | :--- | :--- |
| Patient Books Slot | `appointment:created` | `doctor:{doctorId}`, `role:admin` | Doctor sees live toast notification and refresh prompt on appointment list. |
| Doctor Accepts Visit | `appointment:accepted` | `user:{patientId}`, `role:admin` | Patient sees success toast and status badge changes to "Confirmed" in real-time. |
| Doctor Declines Visit | `appointment:rejected` | `user:{patientId}`, `role:admin` | Patient sees danger toast and status badge updates to "Declined". |
| Doctor Completes Visit | `appointment:completed` | `user:{patientId}`, `role:admin` | Patient sees completed toast and badge updates to "Completed". |
| Patient / Doctor Cancels| `appointment:cancelled` | `user:{patientId}`, `doctor:{doctorId}`| Real-time toast alert; slot is released for re-booking. |

---

## 18. Project Folder Structure

```
Clinic-Appointment-Management-System/
├── app.js                          # Express app configuration, middlewares, and route mounting
├── server.js                       # HTTP server bootstrap, Socket.IO init, and DB connection
├── package.json                    # Project dependencies and npm scripts
├── package-lock.json               # Locked dependency tree
├── .env                            # Local environment variables (NEVER committed)
├── .env.example                    # Template environment file
├── .gitignore                      # Git exclusion rules
├── README.md                       # Comprehensive documentation
│
├── config/
│   └── db.js                       # Reusable Mongoose connection with error handling & shutdown
│
├── models/
│   ├── User.js                     # User schema, bcrypt password hashing & authentication
│   ├── DoctorProfile.js            # Doctor clinic metadata, working days & consultation hours
│   └── Appointment.js              # Appointment schema & compound unique double-booking index
│
├── controllers/
│   ├── authController.js           # Registration, login, logout, and session lifecycle
│   ├── patientController.js        # Patient dashboard, doctor browsing, history & pagination
│   ├── doctorController.js         # Doctor dashboard, schedule settings & appointment management
│   ├── appointmentController.js    # Concurrency-safe booking, accept, reject, complete & next slot
│   └── adminController.js          # Admin dashboard & clinic-wide appointment analytics
│
├── routes/
│   ├── indexRoutes.js              # Landing page, root auth aliases & slots JSON API
│   ├── authRoutes.js               # /auth login, register, and logout routes
│   ├── patientRoutes.js            # /patient dashboard, doctors, and appointment routes
│   ├── doctorRoutes.js             # /doctor dashboard, appointments, and profile routes
│   ├── adminRoutes.js              # /admin dashboard and clinic management routes
│   └── appointmentRoutes.js        # /appointments booking, transitions, and detail views
│
├── middleware/
│   ├── auth.js                     # requireAuth, redirectIfAuthenticated, sessionLocals
│   ├── role.js                     # requireRole('patient'|'doctor'|'admin'), requireDoctorOrAdmin
│   ├── validation.js               # Server-side input sanitization and schema validators
│   ├── rateLimiter.js              # Rate limiting for auth routes against brute-force attacks
│   └── errorHandler.js             # Centralized 404 and 500 error handlers
│
├── sockets/
│   └── socket.js                   # Socket.IO room subscriptions and targeted event emitters
│
├── utils/
│   ├── asyncHandler.js             # Async error-wrapping utility for Express handlers
│   └── slotUtils.js                # Slot generation, day-of-week checks & next available slot
│
├── views/
│   ├── index.ejs                   # Public landing page
│   ├── partials/
│   │   ├── header.ejs              # HTML head, Meta tags, Google Fonts, and CSS links
│   │   ├── navbar.ejs              # Role-aware responsive navigation bar
│   │   ├── footer.ejs              # Footer and copyright
│   │   ├── flash.ejs               # Flash alerts (success, error, info) & suggested slot UI
│   │   └── statusBadge.ejs         # Reusable color-coded appointment status badges
│   ├── auth/
│   │   ├── login.ejs               # Login view
│   │   └── register.ejs            # Role-aware registration view (Patient / Doctor)
│   ├── patient/
│   │   ├── dashboard.ejs           # Patient home dashboard with upcoming appointment stats
│   │   ├── doctors.ejs             # Doctor search and specialization directory
│   │   ├── doctorDetails.ejs       # Doctor bio and dynamic date/time slot picker
│   │   └── history.ejs             # Paginated appointment history and status filter
│   ├── doctor/
│   │   ├── dashboard.ejs           # Doctor metric cards and upcoming appointments
│   │   ├── appointments.ejs        # Doctor appointment management table with action buttons
│   │   └── profile.ejs             # Doctor consultation schedule & duration configuration
│   ├── admin/
│   │   └── dashboard.ejs           # Clinic-wide metric summary and administrative controls
│   ├── appointments/
│   │   └── details.ejs             # Detailed appointment receipt, doctor bio, and notes
│   └── errors/
│       ├── 403.ejs                 # Access Forbidden page
│       ├── 404.ejs                 # Page Not Found view
│       └── 500.ejs                 # Internal Server Error view
│
├── public/
│   ├── css/
│   │   └── styles.css              # Custom medical design system, responsive styles & components
│   └── js/
│       ├── booking.js              # Client-side dynamic slot fetcher & slot button selector
│       └── realtime.js             # Client-side Socket.IO listener & toast notification system
│
└── scripts/
    ├── testDb.js                   # Database connectivity tester
    ├── testSlots.js                # Unit tests for slot generation and day-of-week calculations
    ├── testDoubleBooking.js        # Automated simulation verifying MongoDB unique index constraint
    ├── testIntegration.js          # Complete 15-step end-to-end HTTP workflow test suite
    └── testSocket.js               # Real-time WebSocket room targeting and event verification
```

---

## 19. Authentication Strategy
- **Session-Based State**: Implements `express-session` with secure cookies (`httpOnly: true`, `sameSite: 'lax'`, `secure: production`).
- **Cryptographic Hashing**: All passwords hashed using `bcryptjs` with 10 salt rounds before storage.
- **Zero Plain-Text Leakage**: `passwordHash` is excluded from user queries and projections.
- **Brute-Force Mitigation**: `express-rate-limit` limits login and registration endpoints to 20 attempts per 15 minutes per IP.

---

## 20. Authorization Strategy (RBAC)
MediPulse employs strict role-based access control middleware:
- `requireAuth`: Verifies that a valid session exists; redirects guests to `/login`.
- `requireRole('patient')`: Restricts patient dashboard, doctor booking, and personal history to patients.
- `requireRole('doctor')`: Restricts doctor schedule updates and dashboard to doctors.
- `requireDoctorOrAdmin`: Grants doctor and admin roles permission to review, accept, reject, or complete appointments.
- **URL Tampering Defense**: Direct URL tampering (e.g. a patient navigating to `/doctor/dashboard` or attempting to POST to `/appointments/:id/accept`) produces an immediate `403 Forbidden` response.

---

## 21. Security Considerations
1. **Helmet HTTP Headers**: Enforces secure HTTP headers protecting against clickjacking, MIME-sniffing, and XSS.
2. **Strict Server-Side Validation**: All input fields (`name`, `email`, `password`, `doctorId`, `appointmentDate`, `appointmentTime`, `notes`) are sanitized and validated on the backend.
3. **Timezone-Agnostic Scheduling**: Dates stored as ISO format strings (`YYYY-MM-DD`) and times as 24h strings (`HH:MM`), preventing UTC/local daylight savings drift.
4. **Credential Isolation**: Database credentials, session secrets, and connection strings are managed exclusively via environment variables.

---

## 22. Performance & Optimization Decisions
1. **Targeted MongoDB Indexes**:
   - `User`: Unique index on `email`.
   - `DoctorProfile`: Index on `specialization`.
   - `Appointment`: Compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` with partial filter; index on `{ patientId: 1, appointmentDate: -1, createdAt: -1 }` for fast history rendering; index on `{ doctorId: 1, appointmentDate: 1, status: 1 }` for doctor schedule lookup.
2. **Mongoose `.lean()` Execution**: Applied to all read-only queries (`getDoctors`, `getAppointments`, `getDashboard`), bypassing Mongoose document hydration for higher throughput and lower RAM usage.
3. **N+1 Query Elimination**: Batch-fetches associated doctor profiles using `$in: doctorIds` instead of issuing queries inside loops.
4. **Pagination**: Server-side pagination (`skip` and `limit`) on appointment lists prevents unbounded memory consumption.
5. **Selective Field Projections**: Selects only necessary attributes (`select('name email role')`).
6. **Room-Isolated WebSockets**: Sockets emit events only to relevant user and doctor rooms, preventing broad network fan-out.

---

## 23. Environment Variables

| Variable | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `development` / `production` | Node runtime environment |
| `PORT` | Yes | `3000` | Server listening port |
| `MONGODB_URI` | Yes | `mongodb+srv://...` or `mongodb://127.0.0.1:27017/...` | MongoDB Atlas / Server connection string |
| `SESSION_SECRET` | Yes | Long random secret string | Encryption secret for session cookies |
| `APP_URL` | Optional | `http://localhost:3000` | Fully qualified base application URL |

---

## 24. Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/Divyanshgupta2580/Clinic-Appointment-Management-System.git
cd Clinic-Appointment-Management-System

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env
```

---

## 25. MongoDB Atlas Setup

1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Database Cluster (Free Shared Tier M0 is sufficient).
3. Under **Database Access**, create a database user with Read and Write privileges.
4. Under **Network Access**, add IP `0.0.0.0/0` (or your deployment host IP).
5. Click **Connect** → **Drivers** (Node.js) and copy the connection string.
6. Paste the string into your `.env` file as `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/clinic_appointment_db?retryWrites=true&w=majority
   ```

---

## 26. Running Locally

```bash
# Start the production-ready server
npm start

# Or start in watch mode (Node 18+)
npm run dev
```
Open your browser and navigate to: **http://localhost:3000**

---

## 27. Automated Testing Suite

The repository includes a comprehensive automated test suite verifying every component:

```bash
# Run unit tests (slot generation, date math, day-of-week)
node scripts/testSlots.js

# Run database-level double-booking and concurrency test
node scripts/testDoubleBooking.js

# Run full 15-step end-to-end integration test
node scripts/testIntegration.js

# Run Socket.IO room targeting and real-time event test
node scripts/testSocket.js
```

### Verified Test Matrix:
- [x] **Unit Testing**: Time conversions (`timeToMinutes`, `minutesToTime`), 15/30/60-min slot generation, and UTC day-of-week calculations.
- [x] **Double-Booking Prevention**: Proves MongoDB engine throws `E11000 duplicate key error` on identical bookings and suggests next available opening.
- [x] **Authentication & Security**: Registration, password verification, rate-limiting, and session creation.
- [x] **Role Authorization**: Unauthenticated redirects, 403 Forbidden enforcement across cross-role paths.
- [x] **Appointment Lifecycle**: Pending → Accepted → Completed transitions, with slot release upon cancellation or rejection.
- [x] **WebSocket Live Events**: Socket targeting to `doctor:{id}` and `user:{id}` without global leaks.

---

## 28. Deployment Guide (e.g. Render / Railway)

### Deploying to Render:
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete production-ready clinic appointment management system"
   git push origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Add Environment Variables in the Render UI:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (or leave default for Render)
   - `MONGODB_URI` = `mongodb+srv://...`
   - `SESSION_SECRET` = `<generate-a-strong-random-key>`
   - `APP_URL` = `https://<your-render-app-name>.onrender.com`
7. Click **Deploy Web Service**.

---

## 29. Deployment Environment Variables
Ensure the following variables are configured in your hosting platform dashboard:
- `NODE_ENV`: Must be `production` so session cookies enforce `secure: true`.
- `PORT`: Assigned dynamically by hosting platform or defaults to `3000`.
- `MONGODB_URI`: Remote MongoDB Atlas connection URI with database name.
- `SESSION_SECRET`: Cryptographically strong random string (minimum 32 characters).
- `APP_URL`: Public HTTPS URL of the deployed application.

---

## 30. Common Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| `MongooseServerSelectionError` | Invalid MongoDB Atlas URI or IP not whitelisted. | Verify Atlas Network Access includes `0.0.0.0/0` and username/password are URL-encoded. |
| `connect EPERM 127.0.0.1:27017` | Local MongoDB daemon is not running. | Run `mongod --dbpath ./data/db` or verify MongoDB service is active. |
| Socket.IO notifications not appearing | Client not logged in or mismatched user ID. | Log in as a registered user; verify `window.CURRENT_USER` is injected into the view. |
| Duplicate slot booked unexpectedly | Compound index was not created in MongoDB. | Restart server or run `node scripts/testDoubleBooking.js` to ensure index synchronization. |
| Cookie session not persisting on HTTPS | `NODE_ENV` set to `production` over unencrypted HTTP. | Use HTTPS in production or set `NODE_ENV=development` for local HTTP testing. |

---

## 31. Screenshots Section
*(Screenshots can be added here following live deployment)*

- **Landing Page**: Modern healthcare introduction with call-to-action buttons.
- **Doctor Directory**: Searchable list of clinic physicians with specializations and experience.
- **Slot Selection & Booking**: Dynamic slot buttons reflecting live availability.
- **Conflict & Next Slot Suggestion**: Alert banner showing automatically suggested next slot.
- **Doctor Appointment Queue**: Management interface to accept, reject, or complete visits.

---

## 32. Demo Section Placeholder
- **Live Demo URL**: *(Add your deployed production link here, e.g., Render/Railway)*
- **Demo Video / Walkthrough**: *(Link to demonstration video or repository release)*

---

## 33. Challenges Faced & Overcome
1. **Eliminating Race Conditions**: Typical web applications rely on `findOne()` followed by `create()`. We solved this by enforcing a MongoDB compound unique index and catching error code 11000, delegating atomicity to the database engine.
2. **Releasing Slots on Decline/Cancellation**: Rather than deleting records (which would destroy audit logs), we utilized a MongoDB `partialFilterExpression` matching only active statuses (`pending`, `accepted`, `completed`). This keeps the audit trail intact while instantly unlocking the slot.
3. **Timezone Discrepancies in Scheduling**: Using standard JavaScript `Date()` objects often introduces shifts when servers and clients reside in different timezones. We addressed this by standardizing slot representations as strict `YYYY-MM-DD` and `HH:MM` strings.

---

## 34. Design & Technical Decisions
- **EJS Over SPA Frameworks**: Maximized reliability and development velocity within hackathon constraints by using server-side rendered EJS templates with modular partials, avoiding complex client state stores and build toolchains.
- **Atomic MongoDB Locking Over Distributed Locks**: Avoided external infrastructure dependencies like Redis Redlock by leveraging MongoDB's native indexing engine.
- **Targeted Socket.IO Rooms**: Partitioned real-time communication into private rooms, ensuring doctors and patients only receive events pertinent to their own accounts.

---

## 35. Future Improvements
- **Automated SMS & Email Reminders**: Integration with Twilio or SendGrid for 24-hour appointment reminders.
- **Multi-Clinic Telemedicine**: WebRTC video consultation room links generated upon appointment acceptance.
- **Prescription & Diagnostic Attachments**: File uploads for medical reports and digital prescriptions.
- **Patient Rescheduling Self-Service**: Direct one-click rescheduling without requiring full cancellation.

---

## 36. Hackathon Implementation Notes
- Completed under strict 3-hour hackathon constraints.
- **Zero Mock Data Rule**: The codebase strictly uses real database records entered through application forms or explicit test scripts. No fake doctors or placeholder appointments exist in source code.
- **Auditable Codebase**: Clean MVC separation (`controllers/`, `models/`, `routes/`, `views/`, `middleware/`, `utils/`, `sockets/`) designed for straightforward walkthrough and live judge evaluation.

---

*MediPulse Clinic Appointment Management System — Built for Healthcare Reliability.*
