# API & Route Reference: MediPulse Clinic

This document details all HTTP endpoints implemented in the MediPulse Clinic Management System.

---

## 1. Public & Core Routes (`routes/indexRoutes.js`)

### 1.1 Landing Page
- **Method:** `GET`
- **Path:** `/`
- **Access:** Public (All users)
- **Middleware:** None
- **Handler:** `(req, res) => res.render('index')`
- **Purpose:** Renders the public landing page highlighting clinical features and navigation.
- **Output:** Rendered HTML view (`views/index.ejs`).

### 1.2 Available Slots API
- **Method:** `GET`
- **Path:** `/api/doctors/:id/available-slots`
- **Access:** Public / Authenticated
- **Middleware:** None
- **Handler:** `appointmentController.getAvailableSlotsApi`
- **Purpose:** Returns all generated slots, booked slots, and free slots for a doctor on a given date.
- **Query Parameters:**
  - `date` (`YYYY-MM-DD`, required): Target consultation date.
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "date": "2026-11-20",
    "allSlots": ["09:00", "09:30", "10:00", "10:30"],
    "availableSlots": ["09:30", "10:00", "10:30"],
    "occupiedSlots": ["09:00"],
    "isAvailableDay": true
  }
  ```
- **Error Responses:**
  - `HTTP 400`: Missing or invalid `date` query parameter.

---

## 2. Authentication Routes (`routes/authRoutes.js` & aliases in `routes/indexRoutes.js`)

### 2.1 View Login Form
- **Method:** `GET`
- **Path:** `/auth/login` (Alias: `/login`)
- **Access:** Unauthenticated only
- **Middleware:** `redirectIfAuthenticated`
- **Handler:** `authController.getLogin`
- **Purpose:** Renders the login form.
- **Output:** Rendered HTML view (`views/auth/login.ejs`).

### 2.2 Process Login
- **Method:** `POST`
- **Path:** `/auth/login` (Alias: `/login`)
- **Access:** Unauthenticated
- **Middleware:** `authLimiter`, `validateLogin`
- **Handler:** `authController.postLogin`
- **Inputs (Form Body):**
  - `email`: String (valid email)
  - `password`: String (min 1 char)
- **Success Response:** HTTP 302 Redirect to role dashboard (`/doctor/dashboard`, `/patient/dashboard`, or `/admin/dashboard`).
- **Error Responses:**
  - `HTTP 400`: Missing email or password format violation.
  - `HTTP 401`: Invalid email or incorrect password.
  - `HTTP 429`: Exceeded 60 attempts in 15 minutes.

### 2.3 View Registration Form
- **Method:** `GET`
- **Path:** `/auth/register` (Alias: `/register`)
- **Access:** Unauthenticated only
- **Middleware:** `redirectIfAuthenticated`
- **Handler:** `authController.getRegister`
- **Purpose:** Renders the registration form with dynamic doctor fields.
- **Output:** Rendered HTML view (`views/auth/register.ejs`).

### 2.4 Process Registration
- **Method:** `POST`
- **Path:** `/auth/register` (Alias: `/register`)
- **Access:** Unauthenticated
- **Middleware:** `authLimiter`, `validateRegister`
- **Handler:** `authController.postRegister`
- **Inputs (Form Body):**
  - `name`: String (min 2 chars)
  - `email`: String (valid email)
  - `password`: String (min 6 chars)
  - `role`: Enum (`'patient'`, `'doctor'`)
  - *If doctor:* `specialization`, `qualification`, `experience`, `consultationDuration`, `availableStartTime`, `availableEndTime`.
- **Success Response:** HTTP 302 Redirect to role dashboard.
- **Error Responses:**
  - `HTTP 400`: Validation error (password too short, missing fields, or duplicate email).
  - `HTTP 429`: Rate limit exceeded.

### 2.5 Logout
- **Method:** `POST` or `GET`
- **Path:** `/auth/logout` (Alias: `/logout`)
- **Access:** Authenticated
- **Handler:** `authController.postLogout`
- **Purpose:** Destroys session, clears session cookies (`medipulse.sid` and `connect.sid`), and redirects to login.
- **Success Response:** HTTP 302 Redirect to `/auth/login?success=...`.

---

## 3. Patient Routes (`routes/patientRoutes.js`)
*All routes in this group require: `requireAuth` + `requireRole('patient')`*

### 3.1 Patient Dashboard
- **Method:** `GET`
- **Path:** `/patient/dashboard`
- **Handler:** `patientController.getDashboard`
- **Purpose:** Shows upcoming visits count, pending count, total bookings, and recent appointments.
- **Output:** Rendered HTML view (`views/patient/dashboard.ejs`).

### 3.2 Browse Doctors
- **Method:** `GET`
- **Path:** `/patient/doctors`
- **Handler:** `patientController.getDoctors`
- **Query Parameters:** `specialization` (optional), `search` (optional)
- **Purpose:** Searchable and filterable directory of active clinic doctors.
- **Output:** Rendered HTML view (`views/patient/doctors.ejs`).

### 3.3 Doctor Details & Booking Form
- **Method:** `GET`
- **Path:** `/patient/doctors/:id`
- **Handler:** `patientController.getDoctorDetails`
- **Query Parameters:** `date` (optional preselect), `time` (optional preselect)
- **Purpose:** View doctor qualifications, consultation length, and interactive slot picker.
- **Output:** Rendered HTML view (`views/patient/doctorDetails.ejs`).

### 3.4 Appointment History
- **Method:** `GET`
- **Path:** `/patient/appointments`
- **Handler:** `patientController.getAppointments`
- **Query Parameters:** `status` (optional filter), `page` (optional pagination)
- **Purpose:** Paginated listing of past and upcoming appointments with cancellation buttons.
- **Output:** Rendered HTML view (`views/patient/history.ejs`).

---

## 4. Doctor Routes (`routes/doctorRoutes.js`)
*All routes in this group require: `requireAuth` + `requireDoctorOrAdmin`*

### 4.1 Doctor Dashboard
- **Method:** `GET`
- **Path:** `/doctor/dashboard`
- **Handler:** `doctorController.getDashboard`
- **Purpose:** Shows today's scheduled consultations, pending review count, and completed count.
- **Output:** Rendered HTML view (`views/doctor/dashboard.ejs`).

### 4.2 Doctor Appointments Oversight
- **Method:** `GET`
- **Path:** `/doctor/appointments`
- **Handler:** `doctorController.getAppointments`
- **Query Parameters:** `status` (optional), `date` (optional `YYYY-MM-DD`), `page` (optional)
- **Purpose:** Filterable, paginated management table with Accept, Reject, Complete, and Cancel actions.
- **Output:** Rendered HTML view (`views/doctor/appointments.ejs`).

### 4.3 View Schedule Settings
- **Method:** `GET`
- **Path:** `/doctor/profile`
- **Handler:** `doctorController.getProfile`
- **Purpose:** View and adjust consultation duration, shift hours, and active clinic days.
- **Output:** Rendered HTML view (`views/doctor/profile.ejs`).

### 4.4 Update Schedule Settings
- **Method:** `POST`
- **Path:** `/doctor/profile`
- **Handler:** `doctorController.updateProfile`
- **Inputs (Form Body):** `specialization`, `qualification`, `experience`, `consultationDuration`, `availableStartTime`, `availableEndTime`, `availableDays`.
- **Success Response:** HTTP 302 Redirect to `/doctor/profile`.

---

## 5. Appointment Management Routes (`routes/appointmentRoutes.js`)
*All routes in this group require: `requireAuth`*

### 5.1 Book an Appointment
- **Method:** `POST`
- **Path:** `/appointments/book` (Alias in patientRoutes: `/patient/appointments`)
- **Access:** Patient role (`requireRole('patient')`)
- **Middleware:** `validateAppointment`
- **Handler:** `appointmentController.bookAppointment`
- **Inputs (Form Body):**
  - `doctorId`: ObjectId string
  - `appointmentDate`: String (`YYYY-MM-DD`)
  - `appointmentTime`: String (`HH:MM`)
  - `notes`: String (optional, max 500 chars)
- **Success Response:** HTTP 302 Redirect to `/patient/appointments`.
- **Conflict Handling (Double Booking):**
  - Caught by controller on MongoDB `err.code === 11000`.
  - Calculates `findNextAvailableSlot(doctorId, date, time)`.
  - Web clients receive HTTP 302 redirect back to doctor profile with flash error + `suggestedSlot`.
  - API / JSON requests receive HTTP 409 Conflict with `{ success: false, message, suggestedSlot }`.

### 5.2 Accept Appointment
- **Method:** `POST`
- **Path:** `/appointments/:id/accept`
- **Access:** Doctor assigned or Admin (`requireDoctorOrAdmin`)
- **Handler:** `appointmentController.acceptAppointment`
- **Transitions:** `pending` ➔ `accepted`
- **Socket Notification:** Emits `appointment:accepted` to room `user:<patientId>`.
- **Success Response:** HTTP 302 Redirect to `/doctor/appointments`.

### 5.3 Reject Appointment
- **Method:** `POST`
- **Path:** `/appointments/:id/reject`
- **Access:** Doctor assigned or Admin (`requireDoctorOrAdmin`)
- **Handler:** `appointmentController.rejectAppointment`
- **Transitions:** `pending` ➔ `rejected` (frees slot for rebooking)
- **Socket Notification:** Emits `appointment:rejected` to room `user:<patientId>`.
- **Success Response:** HTTP 302 Redirect to `/doctor/appointments`.

### 5.4 Complete Appointment
- **Method:** `POST`
- **Path:** `/appointments/:id/complete`
- **Access:** Doctor assigned or Admin (`requireDoctorOrAdmin`)
- **Handler:** `appointmentController.completeAppointment`
- **Transitions:** `accepted` ➔ `completed`
- **Socket Notification:** Emits `appointment:completed` to room `user:<patientId>`.
- **Success Response:** HTTP 302 Redirect to `/doctor/appointments`.

### 5.5 Cancel Appointment
- **Method:** `POST`
- **Path:** `/appointments/:id/cancel`
- **Access:** Patient owner, assigned Doctor, or Admin
- **Handler:** `appointmentController.cancelAppointment`
- **Transitions:** `pending` or `accepted` ➔ `cancelled` (frees slot for rebooking)
- **Socket Notification:** Emits `appointment:cancelled` to `user:<patientId>`, `doctor:<doctorId>`, and `role:admin`.
- **Success Response:** HTTP 302 Redirect to respective appointments list.

### 5.6 Single Appointment Details
- **Method:** `GET`
- **Path:** `/appointments/:id`
- **Access:** Patient owner, assigned Doctor, or Admin
- **Handler:** `appointmentController.getAppointmentDetails`
- **Output:** Rendered HTML view (`views/appointments/details.ejs`).

---

## 6. Admin Routes (`routes/adminRoutes.js`)
*All routes in this group require: `requireAuth` + `requireRole('admin')`*

### 6.1 Admin Dashboard
- **Method:** `GET`
- **Path:** `/admin/dashboard`
- **Handler:** `adminController.getDashboard`
- **Purpose:** Clinic-wide counts for patients, doctors, appointments by status, and doctor roster.
- **Output:** Rendered HTML view (`views/admin/dashboard.ejs`).
