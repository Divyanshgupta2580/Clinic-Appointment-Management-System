# API & Route Reference

This document provides a complete, factual reference for every HTTP endpoint in the MediPulse Clinic Management System. No endpoints are invented; every entry maps directly to actual code in `routes/`.

---

## 1. Public & Core Endpoints

### `GET /`
- **METHOD:** `GET`
- **PATH:** `/`
- **AUTHENTICATION:** None (Public)
- **ROLE:** Any (Guest, Patient, Doctor, Admin)
- **MIDDLEWARE:** None
- **CONTROLLER:** Inline in `routes/indexRoutes.js`
- **PURPOSE:** Render the public landing page with clinic features, mission, and direct role-based CTA buttons.
- **INPUT:** None
- **DATABASE OPERATION:** None
- **SUCCESS:** HTTP 200 renders `views/index.ejs`
- **ERRORS:** HTTP 500 on template failure

---

### `GET /api/doctors/:id/available-slots`
- **METHOD:** `GET`
- **PATH:** `/api/doctors/:id/available-slots`
- **AUTHENTICATION:** None (Public JSON endpoint for booking UI)
- **ROLE:** Any
- **MIDDLEWARE:** None
- **CONTROLLER:** `appointmentController.getAvailableSlotsApi`
- **PURPOSE:** Retrieve generated time slots, occupied slots, and available slots for a doctor on a specific date.
- **INPUT:**
  - Route param: `:id` (Doctor User ObjectId)
  - Query string: `?date=YYYY-MM-DD`
- **DATABASE OPERATION:**
  - `DoctorProfile.findOne({ userId: id })`
  - `Appointment.find({ doctorId, appointmentDate, status: { $in: ['pending', 'accepted', 'completed'] } })`
- **SUCCESS:** HTTP 200 JSON `{ success: true, date, allSlots, availableSlots, occupiedSlots, isAvailableDay }`
- **ERRORS:**
  - HTTP 400 JSON if `date` is missing or not formatted as `YYYY-MM-DD`
  - HTTP 500 JSON on server error

---

## 2. Authentication Endpoints

### `GET /login` (and `GET /auth/login`)
- **METHOD:** `GET`
- **PATH:** `/login` / `/auth/login`
- **AUTHENTICATION:** None
- **ROLE:** Unauthenticated guests only
- **MIDDLEWARE:** `redirectIfAuthenticated`
- **CONTROLLER:** `authController.getLogin`
- **PURPOSE:** Render the user login form.
- **INPUT:** Query param `?redirect=/intended/path` (optional)
- **DATABASE OPERATION:** None
- **SUCCESS:** HTTP 200 renders `views/auth/login.ejs` (or HTTP 302 redirect to role dashboard if already logged in)
- **ERRORS:** None

---

### `POST /login` (and `POST /auth/login`)
- **METHOD:** `POST`
- **PATH:** `/login` / `/auth/login`
- **AUTHENTICATION:** None
- **ROLE:** Unauthenticated guests
- **MIDDLEWARE:** `authLimiter`, `validateLogin`
- **CONTROLLER:** `authController.postLogin`
- **PURPOSE:** Authenticate credentials, start user session, and redirect to role-specific dashboard.
- **INPUT:** `req.body`: `{ email, password }`
- **DATABASE OPERATION:** `User.findOne({ email })`
- **SUCCESS:** HTTP 302 Redirect to `/patient/dashboard`, `/doctor/dashboard`, or `/admin/dashboard` (with session cookie)
- **ERRORS:**
  - HTTP 400 if validation fails
  - HTTP 401 if user not found or password does not match
  - HTTP 429 if rate limit exceeded

---

### `GET /register` (and `GET /auth/register`)
- **METHOD:** `GET`
- **PATH:** `/register` / `/auth/register`
- **AUTHENTICATION:** None
- **ROLE:** Unauthenticated guests only
- **MIDDLEWARE:** `redirectIfAuthenticated`
- **CONTROLLER:** `authController.getRegister`
- **PURPOSE:** Render the user registration form with doctor schedule fields if doctor role is selected.
- **INPUT:** None
- **DATABASE OPERATION:** None
- **SUCCESS:** HTTP 200 renders `views/auth/register.ejs`
- **ERRORS:** None

---

### `POST /register` (and `POST /auth/register`)
- **METHOD:** `POST`
- **PATH:** `/register` / `/auth/register`
- **AUTHENTICATION:** None
- **ROLE:** Unauthenticated guests
- **MIDDLEWARE:** `authLimiter`, `validateRegister`
- **CONTROLLER:** `authController.postRegister`
- **PURPOSE:** Create new User account, initialize DoctorProfile if doctor, start session, and redirect.
- **INPUT:** `req.body`: `{ name, email, password, role, specialization, qualification, experience, consultationDuration, availableStartTime, availableEndTime }`
- **DATABASE OPERATION:**
  - `User.findOne({ email })` (uniqueness check)
  - `User.create({ name, email, passwordHash, role })`
  - `DoctorProfile.create(...)` (if role === 'doctor')
- **SUCCESS:** HTTP 302 Redirect to dashboard with welcome flash message
- **ERRORS:**
  - HTTP 400 if validation fails or email already registered
  - HTTP 429 if rate limit exceeded

---

### `POST /logout` (and `GET /logout`)
- **METHOD:** `POST` (also accepts `GET` as a safe fallback)
- **PATH:** `/logout` / `/auth/logout`
- **AUTHENTICATION:** Any
- **ROLE:** Any
- **MIDDLEWARE:** None
- **CONTROLLER:** `authController.postLogout`
- **PURPOSE:** Destroy active session, clear session cookie, and redirect to login.
- **INPUT:** None
- **DATABASE OPERATION:** None
- **SUCCESS:** HTTP 302 Redirect to `/auth/login?success=Logged out successfully.`
- **ERRORS:** None

---

## 3. Patient Portal Endpoints

### `GET /patient/dashboard`
- **METHOD:** `GET`
- **PATH:** `/patient/dashboard`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`
- **MIDDLEWARE:** `requireAuth`, `requireRole('patient')`
- **CONTROLLER:** `patientController.getDashboard`
- **PURPOSE:** Display patient dashboard metrics (total bookings, pending count, upcoming count) and recent appointments.
- **INPUT:** None
- **DATABASE OPERATION:**
  - `Appointment.countDocuments({ patientId })`
  - `Appointment.find({ patientId }).sort(...).limit(5).populate('doctorId')`
  - `DoctorProfile.find({ userId: { $in: doctorIds } })`
- **SUCCESS:** HTTP 200 renders `views/patient/dashboard.ejs`
- **ERRORS:** HTTP 401 if unauthenticated, HTTP 403 if not patient role

---

### `GET /patient/doctors`
- **METHOD:** `GET`
- **PATH:** `/patient/doctors`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`
- **MIDDLEWARE:** `requireAuth`, `requireRole('patient')`
- **CONTROLLER:** `patientController.getDoctors`
- **PURPOSE:** Browse verified clinic doctors with search and specialization filter.
- **INPUT:** Query params: `?specialization=...&search=...`
- **DATABASE OPERATION:**
  - `DoctorProfile.find(filter).populate('userId')`
  - `DoctorProfile.distinct('specialization')`
- **SUCCESS:** HTTP 200 renders `views/patient/doctors.ejs`
- **ERRORS:** HTTP 401/403 on auth/role violation

---

### `GET /patient/doctors/:id`
- **METHOD:** `GET`
- **PATH:** `/patient/doctors/:id`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`
- **MIDDLEWARE:** `requireAuth`, `requireRole('patient')`
- **CONTROLLER:** `patientController.getDoctorDetails`
- **PURPOSE:** View doctor profile, schedule information, and interactive slot selection booking form.
- **INPUT:**
  - Route param: `:id` (Doctor User ObjectId)
  - Query params: `?date=...&time=...` (optional preselection from next-slot suggestions)
- **DATABASE OPERATION:**
  - `User.findById(id)`
  - `DoctorProfile.findOne({ userId: id })`
- **SUCCESS:** HTTP 200 renders `views/patient/doctorDetails.ejs`
- **ERRORS:** HTTP 404 if doctor does not exist

---

### `GET /patient/appointments`
- **METHOD:** `GET`
- **PATH:** `/patient/appointments`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`
- **MIDDLEWARE:** `requireAuth`, `requireRole('patient')`
- **CONTROLLER:** `patientController.getAppointments`
- **PURPOSE:** View paginated appointment history with status filtering.
- **INPUT:** Query params: `?status=pending&page=1`
- **DATABASE OPERATION:**
  - `Appointment.countDocuments({ patientId, status? })`
  - `Appointment.find({ patientId, status? }).skip(...).limit(8).populate('doctorId')`
  - `DoctorProfile.find({ userId: { $in: doctorIds } })`
- **SUCCESS:** HTTP 200 renders `views/patient/history.ejs`
- **ERRORS:** HTTP 401/403

---

## 4. Appointment Management Endpoints

### `POST /appointments/book` (and `POST /patient/appointments`)
- **METHOD:** `POST`
- **PATH:** `/appointments/book` / `/patient/appointments`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`
- **MIDDLEWARE:** `requireAuth`, `requireRole('patient')`, `validateAppointment`
- **CONTROLLER:** `appointmentController.bookAppointment`
- **PURPOSE:** Book an appointment slot. Protected by MongoDB compound unique index.
- **INPUT:** `req.body`: `{ doctorId, appointmentDate, appointmentTime, notes }`
- **DATABASE OPERATION:**
  - `User.findById(doctorId)`
  - `Appointment.create({ patientId, doctorId, appointmentDate, appointmentTime, notes, status: 'pending' })`
- **SUCCESS:** HTTP 302 Redirect to `/patient/appointments` with success flash message
- **ERRORS:**
  - HTTP 400 if validation fails
  - HTTP 404 if doctor does not exist
  - HTTP 409 (or redirect with flash) if slot is already occupied (Mongo error 11000 caught; next available slot calculated)

---

### `GET /appointments/:id`
- **METHOD:** `GET`
- **PATH:** `/appointments/:id`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`, `doctor`, or `admin`
- **MIDDLEWARE:** `requireAuth`
- **CONTROLLER:** `appointmentController.getAppointmentDetails`
- **PURPOSE:** View detailed record of a single appointment.
- **INPUT:** Route param `:id` (Appointment ObjectId)
- **DATABASE OPERATION:**
  - `Appointment.findById(id).populate('patientId').populate('doctorId')`
  - `DoctorProfile.findOne({ userId: appointment.doctorId._id })`
- **SUCCESS:** HTTP 200 renders `views/appointments/details.ejs`
- **ERRORS:**
  - HTTP 404 if appointment not found
  - HTTP 403 if user is neither the patient, the assigned doctor, nor an admin (Ownership check)

---

### `POST /appointments/:id/accept`
- **METHOD:** `POST`
- **PATH:** `/appointments/:id/accept`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `appointmentController.acceptAppointment`
- **PURPOSE:** Doctor confirms a pending appointment.
- **INPUT:** Route param `:id`
- **DATABASE OPERATION:**
  - `Appointment.findById(id)`
  - Ownership assertion: doctor must match `appointment.doctorId`
  - `appointment.status = 'accepted'; await appointment.save()`
- **SUCCESS:** HTTP 302 Redirect to `/doctor/appointments` with success flash
- **ERRORS:**
  - HTTP 403 if doctor does not own the appointment
  - HTTP 400 if status is not `pending`
  - HTTP 404 if appointment not found

---

### `POST /appointments/:id/reject`
- **METHOD:** `POST`
- **PATH:** `/appointments/:id/reject`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `appointmentController.rejectAppointment`
- **PURPOSE:** Doctor declines a pending appointment, instantly freeing the slot.
- **INPUT:** Route param `:id`
- **DATABASE OPERATION:**
  - `Appointment.findById(id)`
  - Ownership assertion
  - `appointment.status = 'rejected'; await appointment.save()`
- **SUCCESS:** HTTP 302 Redirect to `/doctor/appointments` with info flash
- **ERRORS:** HTTP 403 / 400 / 404

---

### `POST /appointments/:id/complete`
- **METHOD:** `POST`
- **PATH:** `/appointments/:id/complete`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `appointmentController.completeAppointment`
- **PURPOSE:** Mark an accepted appointment as completed after consultation.
- **INPUT:** Route param `:id`
- **DATABASE OPERATION:**
  - `Appointment.findById(id)`
  - Ownership assertion
  - `appointment.status = 'completed'; await appointment.save()`
- **SUCCESS:** HTTP 302 Redirect to `/doctor/appointments` with success flash
- **ERRORS:**
  - HTTP 400 if status is not `accepted`
  - HTTP 403 / 404

---

### `POST /appointments/:id/cancel`
- **METHOD:** `POST`
- **PATH:** `/appointments/:id/cancel`
- **AUTHENTICATION:** Required
- **ROLE:** `patient`, `doctor`, or `admin`
- **MIDDLEWARE:** `requireAuth`
- **CONTROLLER:** `appointmentController.cancelAppointment`
- **PURPOSE:** Cancel an appointment and release the slot.
- **INPUT:** Route param `:id`
- **DATABASE OPERATION:**
  - `Appointment.findById(id)`
  - Ownership assertion (patient owner or assigned doctor or admin)
  - `appointment.status = 'cancelled'; await appointment.save()`
- **SUCCESS:** HTTP 302 Redirect to referrer or dashboard with cancel info flash
- **ERRORS:**
  - HTTP 400 if already completed, rejected, or cancelled
  - HTTP 403 / 404

---

## 5. Doctor Portal Endpoints

### `GET /doctor/dashboard`
- **METHOD:** `GET`
- **PATH:** `/doctor/dashboard`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `doctorController.getDashboard`
- **PURPOSE:** Display doctor statistics (today's visits, pending count, completed count) and today's schedule.
- **INPUT:** None
- **DATABASE OPERATION:**
  - `Appointment.countDocuments({ doctorId, appointmentDate: todayStr })`
  - `Appointment.countDocuments({ doctorId, status: 'pending' })`
  - `Appointment.countDocuments({ doctorId, status: 'completed' })`
  - `Appointment.find({ doctorId, appointmentDate: todayStr, status: { $in: ['pending', 'accepted'] } }).populate('patientId')`
- **SUCCESS:** HTTP 200 renders `views/doctor/dashboard.ejs`
- **ERRORS:** HTTP 401/403

---

### `GET /doctor/appointments`
- **METHOD:** `GET`
- **PATH:** `/doctor/appointments`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `doctorController.getAppointments`
- **PURPOSE:** Doctor appointment management list with status and date filters and pagination.
- **INPUT:** Query params: `?status=...&date=...&page=1`
- **DATABASE OPERATION:**
  - `Appointment.countDocuments(filter)`
  - `Appointment.find(filter).skip(...).limit(10).populate('patientId').populate('doctorId')`
- **SUCCESS:** HTTP 200 renders `views/doctor/appointments.ejs`
- **ERRORS:** HTTP 401/403

---

### `GET /doctor/profile`
- **METHOD:** `GET`
- **PATH:** `/doctor/profile`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `doctorController.getProfile`
- **PURPOSE:** View doctor consultation schedule, working days, and hours settings.
- **INPUT:** None
- **DATABASE OPERATION:** `DoctorProfile.findOne({ userId: doctorId })`
- **SUCCESS:** HTTP 200 renders `views/doctor/profile.ejs`
- **ERRORS:** HTTP 401/403

---

### `POST /doctor/profile`
- **METHOD:** `POST`
- **PATH:** `/doctor/profile`
- **AUTHENTICATION:** Required
- **ROLE:** `doctor` or `admin`
- **MIDDLEWARE:** `requireAuth`, `requireDoctorOrAdmin`
- **CONTROLLER:** `doctorController.updateProfile`
- **PURPOSE:** Update clinical schedule (available days, start time, end time, consultation duration).
- **INPUT:** `req.body`: `{ specialization, qualification, experience, consultationDuration, availableDays, availableStartTime, availableEndTime }`
- **DATABASE OPERATION:** `DoctorProfile.findOneAndUpdate({ userId: doctorId }, updateData, { upsert: true, runValidators: true })`
- **SUCCESS:** HTTP 302 Redirect to `/doctor/profile` with success flash message
- **ERRORS:** HTTP 400 on validation failure, HTTP 401/403

---

## 6. Admin Portal Endpoints

### `GET /admin/dashboard`
- **METHOD:** `GET`
- **PATH:** `/admin/dashboard`
- **AUTHENTICATION:** Required
- **ROLE:** `admin`
- **MIDDLEWARE:** `requireAuth`, `requireRole('admin')`
- **CONTROLLER:** `adminController.getDashboard`
- **PURPOSE:** Clinic-wide operational metrics and verified doctor directory.
- **INPUT:** None
- **DATABASE OPERATION:**
  - `User.countDocuments({ role: 'patient' })`
  - `User.countDocuments({ role: 'doctor' })`
  - `Appointment.countDocuments()`
  - `Appointment.countDocuments({ status })`
  - `User.find({ role: 'doctor' })`
  - `DoctorProfile.find({ userId: { $in: doctorIds } })`
- **SUCCESS:** HTTP 200 renders `views/admin/dashboard.ejs`
- **ERRORS:** HTTP 401/403
