# Complete File-by-File Codebase Guide

This document provides a component-by-component, file-by-file architectural breakdown of MediPulse Clinic. Use this guide to navigate the code and understand how each file connects to the rest of the application.

---

## 1. System Dependency Hierarchy

```
server.js
 ├── app.js
 │    ├── middleware/auth.js (sessionLocals)
 │    ├── middleware/errorHandler.js (notFoundHandler, errorHandler)
 │    └── routes/
 │         ├── indexRoutes.js
 │         ├── authRoutes.js
 │         ├── patientRoutes.js
 │         ├── doctorRoutes.js
 │         ├── adminRoutes.js
 │         └── appointmentRoutes.js
 ├── config/db.js (Mongoose connection pool)
 └── sockets/socket.js (Socket.IO broker)

appointmentRoutes.js
 ├── middleware/auth.js (requireAuth)
 ├── middleware/role.js (requireRole, requireDoctorOrAdmin)
 ├── middleware/validation.js (validateAppointment)
 └── controllers/appointmentController.js
      ├── models/Appointment.js (Compound unique index)
      ├── models/User.js
      ├── models/DoctorProfile.js
      ├── utils/slotUtils.js (getDoctorSlotsForDate, findNextAvailableSlot)
      └── sockets/socket.js (emitAppointmentCreated, emitAppointmentAccepted, ...)
```

---

## 2. File-by-File Reference

### `server.js`
- **Purpose:** Server bootstrapping, process lifecycle management, and protocol binding.
- **Important Functions / Flow:**
  - `http.createServer(app)`: Wraps Express application in native Node HTTP server.
  - `initSocket(server)`: Attaches the Socket.IO instance to the HTTP server.
  - `startServer()`: Connects to MongoDB, then starts HTTP listening on `PORT` (3000).
  - `shutdown(signal)`: Handles `SIGTERM` and `SIGINT` for graceful connection termination.
- **How it Connects:** Connects `app.js`, `config/db.js`, and `sockets/socket.js`.
- **What I Should Remember:** If MongoDB fails to connect on startup, the server exits immediately with code 1 rather than serving requests with a broken database.

---

### `app.js`
- **Purpose:** Express application setup, global middleware pipeline, and route dispatching.
- **Important Configuration:**
  - `app.set('trust proxy', 1)`: Configures reverse proxy header trust for cloud deployments.
  - `helmet()`: HTTP security headers.
  - `session(...)`: Configures session cookies (`medipulse.sid`, `httpOnly: true`).
  - `sessionLocals`: Injects flash alerts and user state into all EJS templates.
  - Centralized route mounting (`/`, `/auth`, `/patient`, `/doctor`, `/admin`, `/appointments`).
- **How it Connects:** Bridges incoming HTTP requests to route handlers and error handlers.
- **What I Should Remember:** `app.js` configures the Express app instance, while `server.js` handles networking and process signals. This separation makes testing and mocking cleaner.

---

### `config/db.js`
- **Purpose:** MongoDB connection management and pooling via Mongoose.
- **Important Functions:**
  - `connectDB()`: Connects using `process.env.MONGODB_URI` with a 5000ms server selection timeout.
  - `closeDB()`: Closes connection on graceful shutdown or test teardown.
- **How it Connects:** Used by `server.js` on startup and by automated test scripts.
- **What I Should Remember:** Throws an explicit error if `MONGODB_URI` is missing from the environment.

---

### `models/User.js`
- **Purpose:** Represents clinic users with role-based authentication.
- **Important Properties & Methods:**
  - Fields: `name`, `email` (unique index), `passwordHash`, `role` (`patient`, `doctor`, `admin`).
  - `comparePassword(candidate)`: Bcrypt comparison against stored hash.
  - `User.hashPassword(plain)`: Static helper producing salted bcrypt hash (10 rounds).
- **How it Connects:** Used by `authController`, `patientController`, `doctorController`, and `adminController`.
- **What I Should Remember:** Plaintext passwords never enter database documents.

---

### `models/DoctorProfile.js`
- **Purpose:** Stores doctor professional qualifications and scheduling configuration.
- **Important Fields:**
  - `userId`: Reference to `User` model.
  - `specialization`, `qualification`, `experience`.
  - `consultationDuration`: Duration of each slot (default 30 mins).
  - `availableDays`: Array of active days (e.g. `['Monday', 'Tuesday', ...]`).
  - `availableStartTime`, `availableEndTime`: Daily operating hours (e.g. `'09:00'`, `'17:00'`).
- **How it Connects:** Referenced during slot generation in `utils/slotUtils.js` and populated in doctor catalogs.
- **What I Should Remember:** Has an index on `{ specialization: 1 }` for fast filtering.

---

### `models/Appointment.js`
- **Purpose:** Manages clinic bookings and enforces double-booking prevention.
- **Critical Code Section:**
  ```javascript
  appointmentSchema.index(
    { doctorId: 1, appointmentDate: 1, appointmentTime: 1 },
    {
      unique: true,
      partialFilterExpression: {
        status: { $in: ['pending', 'accepted', 'completed'] },
      },
    }
  );
  ```
- **How it Connects:** Used by `appointmentController`, `patientController`, and `doctorController`.
- **What I Should Remember:** The partial filter expression automatically releases cancelled or rejected slots so they can be rebooked, without requiring record deletion.

---

### `controllers/appointmentController.js`
- **Purpose:** Core business logic for booking, state transitions, and concurrency conflict handling.
- **Important Functions:**
  - `bookAppointment`: Directly creates appointment; catches `err.code === 11000`; calls `findNextAvailableSlot` on conflict.
  - `acceptAppointment`: Moves status from `pending` to `accepted`; notifies patient via Socket.IO.
  - `rejectAppointment`: Moves status to `rejected`; notifies patient via Socket.IO.
  - `completeAppointment`: Moves status from `accepted` to `completed`; notifies patient via Socket.IO.
  - `cancelAppointment`: Cancels appointment; releases slot; notifies both parties via Socket.IO.
  - `getAvailableSlotsApi`: Returns free vs occupied slots for dynamic client picker.
- **How it Connects:** Triggered by `appointmentRoutes.js`, reads/writes `models/Appointment.js`, emits through `sockets/socket.js`.
- **What I Should Remember:** Catches database duplicate key errors gracefully to suggest the next opening.

---

### `controllers/authController.js`
- **Purpose:** Handles registration, credential verification, session creation, and logout.
- **Important Functions:**
  - `postLogin`: Verifies email and bcrypt password match; stores session.
  - `postRegister`: Checks for duplicate email; hashes password; auto-creates `DoctorProfile` if role is doctor; auto-logs in.
  - `postLogout`: Destroys session and clears `medipulse.sid` and `connect.sid` cookies.
- **What I Should Remember:** Auto-redirects users to their specific role dashboard upon successful authentication.

---

### `controllers/patientController.js`
- **Purpose:** Patient dashboard, doctor browsing, and personal visit history.
- **Important Functions:**
  - `getDashboard`: Executes counts in parallel (`Promise.all`) and loads recent visits using lean queries.
  - `getDoctors`: Searchable directory supporting name regex and specialization dropdown filters.
  - `getAppointments`: Paginated history table with status filtering tabs.
- **What I Should Remember:** Uses lean queries and batching to avoid N+1 database queries.

---

### `controllers/doctorController.js`
- **Purpose:** Doctor daily schedule, appointment approval workflow, and availability settings.
- **Important Functions:**
  - `getDashboard`: Displays today's scheduled consultations and pending count.
  - `getAppointments`: Full appointment oversight with date filter and status filter.
  - `updateProfile`: Updates consultation length, start/end hours, and available weekdays.
- **What I Should Remember:** If the logged-in user is an administrator, `getAppointments` displays clinic-wide records rather than filtering by a single doctor.

---

### `utils/slotUtils.js`
- **Purpose:** Mathematical slot generation, day-of-week calculation, and next-available-slot search engine.
- **Important Functions:**
  - `generateSlots(startTime, endTime, duration)`: Generates time strings (`['09:00', '09:30', ...]`).
  - `getDayOfWeek(dateStr)`: Determines day of week using UTC date arithmetic to avoid timezone shifts.
  - `getDoctorSlotsForDate(doctorId, dateStr)`: Computes `allSlots - occupiedSlots`.
  - `findNextAvailableSlot(doctorId, requestedDate, requestedTime)`: Checks later slots today; if none, scans up to 7 subsequent calendar days.
- **What I Should Remember:** Pure, deterministic utility with zero client-side dependencies.

---

### `sockets/socket.js`
- **Purpose:** WebSocket broker managing client room registrations and event broadcasting.
- **Important Functions:**
  - `initSocket(server)`: Listens for connections and client room registration (`user:<id>`, `doctor:<id>`, `role:admin`).
  - `emitAppointmentCreated(apt)`: Alerts doctor and admin rooms.
  - `emitAppointmentAccepted(apt)`: Alerts patient room.
  - `emitAppointmentRejected(apt)`: Alerts patient room.
  - `emitAppointmentCompleted(apt)`: Alerts patient room.
  - `emitAppointmentCancelled(apt)`: Alerts patient, doctor, and admin rooms.
- **What I Should Remember:** Never broadcasts sensitive appointment data to a global room.

---

### `public/js/realtime.js`
- **Purpose:** Client-side Socket.IO listener updating DOM status badges and presenting toast alerts.
- **Important Functions:**
  - `showToast(title, message, type)`: Injects accessible, auto-dissolving notification toasts.
  - `updateAppointmentStatusInDOM(id, status)`: Finds matching DOM table rows and flips status badges dynamically without page refresh.
- **What I Should Remember:** Gracefully checks if Socket.IO client library and `window.CURRENT_USER` exist before initializing.

---

### `public/js/booking.js`
- **Purpose:** Client-side slot picker on doctor profile pages.
- **Important Functions:**
  - `loadSlots(dateStr)`: Fetches `/api/doctors/:id/available-slots?date=...` via `fetch()`.
  - Renders slot buttons: sets `.is-taken` (disabled) or attaches click listeners that populate `#appointmentTime`.
- **What I Should Remember:** Sets `dateInput.min` to today's date to prevent past bookings.
