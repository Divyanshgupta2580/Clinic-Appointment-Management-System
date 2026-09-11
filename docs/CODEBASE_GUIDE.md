# Codebase Guide: File-by-File Breakdown

This document provides a file-by-file reference for every active file in the MediPulse Clinic Management System. Each entry explains the **Purpose**, the **Important Part**, an **Explanation**, and **Related Files**.

---

## 1. Core Server & Configuration

### FILE: `server.js`
- **PURPOSE:** Application entry point responsible for environment initialization, database connection, and starting the HTTP server.
- **IMPORTANT PART:** Asynchronous startup sequence: `await connectDB()` before `server.listen(PORT)`.
- **EXPLANATION:** Ensures the application never accepts web traffic before the MongoDB database connection is fully established. It also binds `SIGTERM` and `SIGINT` signals for graceful shutdown.
- **RELATED FILES:** [app.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/app.js), [config/db.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/config/db.js).

---

### FILE: `app.js`
- **PURPOSE:** Express application setup, security middleware configuration, route mounting, and centralized error handling.
- **IMPORTANT PART:** Linear Express middleware pipeline: Helmet → Body Parsers → Static Assets → Session Middleware → Route Routers → 404 Handler → Centralized Error Handler.
- **EXPLANATION:** Configures the Express instance with EJS as the view engine, establishes cookie policies (`httpOnly: true`, `sameSite: 'lax'`), and mounts all modular routers.
- **RELATED FILES:** [server.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/server.js), [middleware/auth.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/auth.js), [middleware/errorHandler.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/errorHandler.js).

---

### FILE: `config/db.js`
- **PURPOSE:** Establishes and manages the Mongoose connection to MongoDB Atlas.
- **IMPORTANT PART:** Reusable singleton connection pattern using `process.env.MONGODB_URI` with error and disconnection event listeners.
- **EXPLANATION:** Connects to MongoDB Atlas with a 5-second server selection timeout. If already connected, it returns the existing connection pool instead of opening redundant connections.
- **RELATED FILES:** [server.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/server.js), [.env](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/.env).

---

## 2. Database Models

### FILE: `models/User.js`
- **PURPOSE:** Defines the schema and methods for all application accounts (Patients, Doctors, and Administrators).
- **IMPORTANT PART:** Unique email constraint and password hashing helper methods (`comparePassword` and static `hashPassword`).
- **EXPLANATION:** Stores user identity with role enum validation (`'patient'`, `'doctor'`, `'admin'`). Handles bcrypt hashing with a salt factor of 10 and constant-time password comparison.
- **RELATED FILES:** [controllers/authController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/authController.js), [models/DoctorProfile.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/DoctorProfile.js).

---

### FILE: `models/DoctorProfile.js`
- **PURPOSE:** Stores clinical metadata, specialization, consultation duration, and weekly schedules for doctor accounts.
- **IMPORTANT PART:** 1-to-1 reference to `User` via `userId` with `unique: true` and weekday array validation.
- **EXPLANATION:** Tracks medical qualification, years of practice, start/end hours (e.g., `'09:00'` to `'17:00'`), and working days of the week.
- **RELATED FILES:** [models/User.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/User.js), [controllers/doctorController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/doctorController.js), [utils/slotUtils.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/slotUtils.js).

---

### FILE: `models/Appointment.js`
- **PURPOSE:** Stores patient-doctor appointment records, date, time slot, status, and clinical notes.
- **IMPORTANT PART:** Compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` with a `partialFilterExpression`.
- **EXPLANATION:** The central technical highlight. Prevents two patients from reserving the same doctor and slot at the storage engine level. The partial filter expression limits the constraint to active appointments (`pending`, `accepted`, `completed`), automatically freeing rejected and cancelled slots.
- **RELATED FILES:** [controllers/appointmentController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/appointmentController.js), [routes/appointmentRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/appointmentRoutes.js).

---

## 3. Middleware

### FILE: `middleware/auth.js`
- **PURPOSE:** Authentication enforcement and session view helpers.
- **IMPORTANT PART:** `requireAuth` (ensures `req.session.user` exists), `redirectIfAuthenticated` (prevents logged-in users from seeing login forms), and `sessionLocals` (injects `currentUser` and `flash` into `res.locals`).
- **EXPLANATION:** Guarantees protected routes cannot be reached anonymously. Injects user session and one-time flash notifications into all EJS templates globally.
- **RELATED FILES:** [app.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/app.js), [routes/patientRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/patientRoutes.js).

---

### FILE: `middleware/role.js`
- **PURPOSE:** Role-Based Access Control (RBAC) enforcement.
- **IMPORTANT PART:** `requireRole(roles)` and composite helper `requireDoctorOrAdmin`.
- **EXPLANATION:** Compares `req.session.user.role` with allowed roles. If unauthorized, halts the pipeline and renders an HTTP 403 Forbidden template or returns 403 JSON.
- **RELATED FILES:** [middleware/auth.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/auth.js), [routes/doctorRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/doctorRoutes.js), [routes/adminRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/adminRoutes.js).

---

### FILE: `middleware/validation.js`
- **PURPOSE:** Server-side input sanitization and format validation.
- **IMPORTANT PART:** Regex and length assertions in `validateRegister`, `validateLogin`, and `validateAppointment`.
- **EXPLANATION:** Rejects malformed email patterns, short passwords, invalid ObjectIds, or improper date formats before any database queries are dispatched, returning HTTP 400.
- **RELATED FILES:** [routes/authRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/authRoutes.js), [routes/appointmentRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/appointmentRoutes.js).

---

### FILE: `middleware/errorHandler.js`
- **PURPOSE:** Centralized HTTP 404 and 500 error processing.
- **IMPORTANT PART:** `notFoundHandler` and 4-argument Express error signature `errorHandler(err, req, res, next)`.
- **EXPLANATION:** Catches unhandled application errors, translates Mongoose `CastError` to 400 and `11000` to 409, and renders appropriate user-friendly error views (`errors/404.ejs`, `errors/500.ejs`) while suppressing internal stack traces in production.
- **RELATED FILES:** [app.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/app.js), [utils/asyncHandler.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/asyncHandler.js).

---

### FILE: `middleware/rateLimiter.js`
- **PURPOSE:** Rate limiting on authentication routes to mitigate brute-force attacks.
- **IMPORTANT PART:** `authLimiter` configured with a 15-minute window and 60-request threshold.
- **EXPLANATION:** Uses `express-rate-limit` on `/login` and `/register`. If requests exceed the limit, it returns HTTP 429 Too Many Requests.
- **RELATED FILES:** [routes/authRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/authRoutes.js), [routes/indexRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/indexRoutes.js).

---

## 4. Controllers

### FILE: `controllers/authController.js`
- **PURPOSE:** Handles user registration, login authentication, and logout session teardown.
- **IMPORTANT PART:** `postRegister` (checks email duplicate, hashes password, saves user, auto-logs in), `postLogin` (validates credentials, sets session), and `postLogout` (`req.session.destroy`).
- **EXPLANATION:** Contains authentication workflows and role-based redirects to dashboards.
- **RELATED FILES:** [models/User.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/User.js), [routes/authRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/authRoutes.js).

---

### FILE: `controllers/appointmentController.js`
- **PURPOSE:** Core business logic for booking, accepting, declining, completing, and canceling clinical appointments.
- **IMPORTANT PART:** Direct `Appointment.create()` catching error `11000`, returning HTTP 409, and calculating `findNextAvailableSlot`.
- **EXPLANATION:** Contains strict ownership authorization (patients can only cancel their own appointments; doctors can only manage appointments assigned to them). Handles status transitions (`pending` → `accepted` → `completed`).
- **RELATED FILES:** [models/Appointment.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/Appointment.js), [utils/slotUtils.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/slotUtils.js), [routes/appointmentRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/appointmentRoutes.js).

---

### FILE: `controllers/patientController.js`
- **PURPOSE:** Patient-facing portal logic: dashboard statistics, doctor directory, booking form views, and appointment history.
- **IMPORTANT PART:** Optimized aggregation and batch doctor profile lookup via `$in` to eliminate N+1 queries.
- **EXPLANATION:** Provides paginated history queries (`getAppointments`), search filters for doctors by name and specialization (`getDoctors`), and dashboard metrics (`getDashboard`).
- **RELATED FILES:** [models/Appointment.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/Appointment.js), [models/DoctorProfile.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/DoctorProfile.js), [routes/patientRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/patientRoutes.js).

---

### FILE: `controllers/doctorController.js`
- **PURPOSE:** Doctor-facing portal logic: daily appointment schedules, appointment management tables, and clinical availability settings.
- **IMPORTANT PART:** Date-filtered and status-filtered paginated appointment retrieval with ownership scoping.
- **EXPLANATION:** Renders doctor metrics (today's visits, pending requests, completed visits), paginated appointment lists with action buttons (`getAppointments`), and schedule update handlers (`updateProfile`).
- **RELATED FILES:** [models/DoctorProfile.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/DoctorProfile.js), [routes/doctorRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/doctorRoutes.js).

---

### FILE: `controllers/adminController.js`
- **PURPOSE:** Administrative overview across clinic operations.
- **IMPORTANT PART:** Parallel `Promise.all` counts of clinic-wide patients, doctors, and appointment states.
- **EXPLANATION:** Aggregates top-level clinic metrics and verified doctors list for administrators.
- **RELATED FILES:** [models/User.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/User.js), [routes/adminRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/adminRoutes.js).

---

## 5. Routes

### FILE: `routes/indexRoutes.js`
- **PURPOSE:** Defines root-level public endpoints: landing page (`/`), clean login/register URLs, and the public slot querying JSON API.
- **RELATED FILES:** [app.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/app.js), [controllers/authController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/authController.js).

### FILE: `routes/authRoutes.js`
- **PURPOSE:** Authentication endpoints (`/auth/login`, `/auth/register`, `/auth/logout`) with rate limiting and validation middleware.
- **RELATED FILES:** [controllers/authController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/authController.js), [middleware/rateLimiter.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/rateLimiter.js).

### FILE: `routes/patientRoutes.js`
- **PURPOSE:** Endpoints for patients (`/patient/dashboard`, `/patient/doctors`, `/patient/doctors/:id`, `/patient/appointments`). Protected by `requireAuth` and `requireRole('patient')`.
- **RELATED FILES:** [controllers/patientController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/patientController.js).

### FILE: `routes/doctorRoutes.js`
- **PURPOSE:** Endpoints for doctors (`/doctor/dashboard`, `/doctor/appointments`, `/doctor/profile`). Protected by `requireAuth` and `requireDoctorOrAdmin`.
- **RELATED FILES:** [controllers/doctorController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/doctorController.js).

### FILE: `routes/adminRoutes.js`
- **PURPOSE:** Endpoints for clinic administrators (`/admin/dashboard`). Protected by `requireAuth` and `requireRole('admin')`.
- **RELATED FILES:** [controllers/adminController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/adminController.js).

### FILE: `routes/appointmentRoutes.js`
- **PURPOSE:** Action endpoints for appointments (`/appointments/book`, `/appointments/:id/accept`, `/appointments/:id/reject`, `/appointments/:id/complete`, `/appointments/:id/cancel`).
- **RELATED FILES:** [controllers/appointmentController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/appointmentController.js).

---

## 6. Utilities

### FILE: `utils/slotUtils.js`
- **PURPOSE:** Mathematical slot generation, doctor working hours/days evaluation, and next available slot search.
- **IMPORTANT PART:** `generateSlots(startTime, endTime, duration)` and `findNextAvailableSlot(doctorId, date, time)`.
- **EXPLANATION:** Converts time strings into minutes for interval calculations, queries active bookings for a doctor on a given date to identify occupied slots, and iterates forward up to 7 days to recommend alternative slots.
- **RELATED FILES:** [controllers/appointmentController.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/controllers/appointmentController.js), [scripts/testSlots.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/scripts/testSlots.js).

---

### FILE: `utils/asyncHandler.js`
- **PURPOSE:** Utility wrapper for asynchronous route controllers.
- **IMPORTANT PART:** `(fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`.
- **EXPLANATION:** Eliminates boilerplate `try/catch` blocks in controllers and ensures any unhandled promise rejections are reliably forwarded to the Express centralized error handler.
- **RELATED FILES:** [middleware/errorHandler.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/middleware/errorHandler.js), all controller files.

---

## 7. Frontend Client Scripts & Key Views

### FILE: `public/js/booking.js`
- **PURPOSE:** Vanilla JavaScript progressive enhancement for the appointment booking form.
- **IMPORTANT PART:** `loadSlots(dateStr)` calling `/api/doctors/:id/available-slots`.
- **EXPLANATION:** Listens for date picker changes, fetches doctor availability asynchronously, disables occupied buttons, and updates hidden form fields before the patient clicks "Confirm & Book".
- **RELATED FILES:** [views/patient/doctorDetails.ejs](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/views/patient/doctorDetails.ejs).

---

### FILE: `views/partials/header.ejs` & `views/partials/footer.ejs`
- **PURPOSE:** Global layout wrappers providing semantic HTML5 scaffolding, Google Fonts, navbar inclusion, flash alert presentation, and closing tags.
- **IMPORTANT PART:** Clean server-rendered HTML with zero WebSocket dependencies.
- **RELATED FILES:** [views/partials/navbar.ejs](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/views/partials/navbar.ejs), [views/partials/flash.ejs](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/views/partials/flash.ejs).

---

## 8. Test Scripts

### FILE: `scripts/testSlots.js`
- **PURPOSE:** Mathematical unit tests verifying slot intervals, conversions, and weekday calculations.
- **RELATED FILES:** [utils/slotUtils.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/slotUtils.js).

### FILE: `scripts/testDoubleBooking.js`
- **PURPOSE:** Verifies the database-level compound unique index constraint by inserting concurrent duplicate bookings and asserting that error `11000` is thrown. Cleans up all test data upon completion.
- **RELATED FILES:** [models/Appointment.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/Appointment.js), [utils/slotUtils.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/utils/slotUtils.js).

### FILE: `scripts/testIntegration.js`
- **PURPOSE:** Comprehensive 15-step end-to-end integration test exercising landing, auth, RBAC, appointment booking, double-booking 409 conflict, next-slot suggestions, doctor acceptance, and completion. Automatically purges all created test records at the end.
- **RELATED FILES:** All routes, middleware, and controllers.
