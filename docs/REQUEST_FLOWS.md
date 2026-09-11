# Detailed Request Flows (11 Core Workflows)

This document traces the complete execution lifecycle for all 11 primary user workflows in the MediPulse Clinic Management System. Each flow details the step-by-step path:

```
Browser ──► Route ──► Middleware ──► Controller ──► Model ──► MongoDB ──► Response / Redirect ──► EJS
```

---

## 1. User Registration Flow

1. **Browser:** User submits registration form (`name`, `email`, `password`, `role`, and optional doctor profile fields) to `POST /register`.
2. **Route:** [routes/indexRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/indexRoutes.js) (or `routes/authRoutes.js`) catches `POST /register`.
3. **Middleware:**
   - `authLimiter` verifies that the client IP has not exceeded 60 requests in the last 15 minutes.
   - `validateRegister` asserts name length (>=2), email regex format, and password length (>=6).
4. **Controller:** `authController.postRegister` executes.
   - Normalizes email to lowercase.
   - Calls `User.findOne({ email })` to check for an existing account.
   - Calls `User.hashPassword(password)` to generate a salted bcrypt hash.
5. **Model:** `User` model initializes a new document instance.
6. **MongoDB:** Executes `users.insertOne({ name, email, passwordHash, role })`. If `role === 'doctor'`, executes `doctorprofiles.insertOne({ userId: newUser._id, ... })`.
7. **Controller Response:** Initializes session: `req.session.user = { _id, name, email, role }`, sets a welcome flash notification, and issues an HTTP 302 Redirect to `/patient/dashboard` (or `/doctor/dashboard`).
8. **EJS:** Browser follows the redirect; the dashboard view renders with `res.locals.currentUser` and `res.locals.flash`.

---

## 2. User Login Flow

1. **Browser:** User enters email and password into `/login` and submits `POST /login`.
2. **Route:** Caught by `router.post('/login')` in [routes/indexRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/indexRoutes.js).
3. **Middleware:**
   - `authLimiter` enforces rate limits.
   - `validateLogin` asserts email and password existence.
4. **Controller:** `authController.postLogin` runs.
5. **Model & MongoDB:** `User.findOne({ email: email.toLowerCase().trim() })` runs on MongoDB `users` collection using the unique `{ email: 1 }` index.
6. **Controller Logic:**
   - If user not found, returns HTTP 401 and re-renders `views/auth/login.ejs` with an error message.
   - If user found, calls `user.comparePassword(password)`. Bcrypt verifies the hash.
   - If invalid, returns HTTP 401.
   - If valid, populates `req.session.user = { _id, name, email, role }`.
7. **Response:** HTTP 302 Redirect to the appropriate dashboard based on `user.role`.
8. **EJS:** The browser renders the target dashboard (e.g., `views/patient/dashboard.ejs`).

---

## 3. User Logout Flow

1. **Browser:** User clicks "Logout" in navbar, sending `POST /logout` (or `GET /logout`).
2. **Route:** Caught by `routes/indexRoutes.js` / `routes/authRoutes.js`.
3. **Middleware:** None.
4. **Controller:** `authController.postLogout` runs.
   - Calls `req.session.destroy(callback)`.
   - Calls `res.clearCookie('medipulse.sid')`.
5. **Model & MongoDB:** No database operation required.
6. **Response:** HTTP 302 Redirect to `/auth/login?success=Logged out successfully.`
7. **EJS:** `views/auth/login.ejs` renders with the logout success banner.

---

## 4. Doctor Listing Flow

1. **Browser:** Patient clicks "Find Doctors" in navigation, requesting `GET /patient/doctors?search=cardio`.
2. **Route:** Handled by [routes/patientRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/patientRoutes.js).
3. **Middleware:**
   - `requireAuth`: Verifies `req.session.user` exists.
   - `requireRole('patient')`: Verifies `req.session.user.role === 'patient'`.
4. **Controller:** `patientController.getDoctors` executes.
   - Parses query parameters `search` and `specialization`.
5. **Model & MongoDB:**
   - `DoctorProfile.find(filter).populate('userId', 'name email').lean()` executes on MongoDB.
   - `DoctorProfile.distinct('specialization')` runs to populate specialty filter pills.
6. **Response:** HTTP 200 `res.render('patient/doctors', { doctors, specializations, ... })`.
7. **EJS:** `views/patient/doctors.ejs` renders doctor cards with qualifications, experience, and consultation hours.

---

## 5. Doctor Details & Slot Selection Flow

1. **Browser:** Patient clicks "Book Appointment" on a doctor card, requesting `GET /patient/doctors/:id`.
2. **Route:** Handled by `routes/patientRoutes.js`.
3. **Middleware:** `requireAuth`, `requireRole('patient')`.
4. **Controller:** `patientController.getDoctorDetails` executes.
5. **Model & MongoDB:**
   - `User.findById(id).select('name email role').lean()`
   - `DoctorProfile.findOne({ userId: id }).lean()`
6. **Response:** HTTP 200 `res.render('patient/doctorDetails', { doctor, profile, ... })`.
7. **EJS & Client Script:** `views/patient/doctorDetails.ejs` renders. [booking.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/public/js/booking.js) initiates a fetch to `GET /api/doctors/:id/available-slots?date=YYYY-MM-DD`. `slotUtils.getDoctorSlotsForDate` returns generated slots and marks occupied slots based on active appointments in MongoDB. The client renders interactive buttons for open slots.

---

## 6. Book Appointment Flow (Successful)

1. **Browser:** Patient selects slot `"10:00"` and clicks "Confirm & Book", sending `POST /appointments/book`.
2. **Route:** Intercepted by [routes/appointmentRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/appointmentRoutes.js).
3. **Middleware:**
   - `requireAuth`: Confirms patient session.
   - `requireRole('patient')`: Confirms patient role.
   - `validateAppointment`: Asserts valid ObjectId for `doctorId`, regex date `YYYY-MM-DD`, and regex time `HH:MM`.
4. **Controller:** `appointmentController.bookAppointment` executes.
   - Verifies doctor exists via `User.findById(doctorId)`.
   - Directly executes `Appointment.create({ patientId, doctorId, appointmentDate, appointmentTime, notes, status: 'pending' })`.
5. **Model & MongoDB:** MongoDB executes the insert. The storage engine checks the compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`. Since the slot is unoccupied, the document is written atomically.
6. **Controller Response:** Sets flash success message: `"Appointment booked successfully with Dr. Smith for 2026-11-20 at 10:00!"`. Issues HTTP 302 Redirect to `/patient/appointments`.
7. **EJS:** `views/patient/history.ejs` renders with the new appointment displayed with a `"Pending Review"` status badge.

---

## 7. Duplicate Booking Flow (Double-Booking Prevented)

1. **Browser:** A second patient attempts to book the identical doctor, date, and time (`10:00 AM`), submitting `POST /appointments/book`.
2. **Route & Middleware:** Passes route, `requireAuth`, `requireRole('patient')`, and `validateAppointment`.
3. **Controller:** `appointmentController.bookAppointment` attempts direct insertion via `Appointment.create(...)`.
4. **Model & MongoDB:** MongoDB's WiredTiger engine checks the compound unique index. A pending/accepted record already exists for this tuple. MongoDB immediately rejects the write with error code `11000 duplicate key error`.
5. **Controller Catch Block:**
   - Catches `err.code === 11000`.
   - Logs warning safely on the server.
   - Calls `findNextAvailableSlot(doctorId, appointmentDate, appointmentTime)` in `utils/slotUtils.js`.
   - Utility finds the next open slot (e.g. `10:30 AM`).
   - If API request, returns HTTP 409 JSON with suggested slot.
   - If browser form submission, sets error flash message: *"The selected appointment slot was just booked by another patient and is no longer available."* and pre-populates `req.session.flash.suggestedSlot`.
6. **Response:** HTTP 302 Redirect back to `/patient/doctors/:id?date=...`.
7. **EJS:** The booking form displays the conflict alert alongside a one-click suggestion button for the next available slot.

---

## 8. Doctor Accepts Appointment Flow

1. **Browser:** Doctor clicks "Accept" button on an appointment in `/doctor/appointments`, sending `POST /appointments/:id/accept`.
2. **Route:** Handled by `routes/appointmentRoutes.js` (and `routes/doctorRoutes.js`).
3. **Middleware:** `requireAuth`, `requireDoctorOrAdmin`.
4. **Controller:** `appointmentController.acceptAppointment` runs.
5. **Model & MongoDB:**
   - `Appointment.findById(id)` retrieves the appointment.
   - **Ownership Check:** Asserts `appointment.doctorId._id.toString() === req.session.user._id` (or `role === 'admin'`).
   - **State Check:** Asserts `appointment.status === 'pending'`.
   - Updates `appointment.status = 'accepted'`.
   - `await appointment.save()` writes the status update to MongoDB.
6. **Response:** Sets success flash: `"Appointment on 2026-11-20 at 10:00 accepted."` and issues HTTP 302 Redirect to `/doctor/appointments`.
7. **EJS:** `views/doctor/appointments.ejs` renders with the appointment badge updated to `"Confirmed / Accepted"`.

---

## 9. Doctor Rejects Appointment Flow

1. **Browser:** Doctor clicks "Reject" on an appointment, sending `POST /appointments/:id/reject`.
2. **Route & Middleware:** `requireAuth`, `requireDoctorOrAdmin`.
3. **Controller:** `appointmentController.rejectAppointment` runs.
4. **Model & MongoDB:**
   - `Appointment.findById(id)` retrieves the appointment.
   - Ownership and state checks pass.
   - Sets `appointment.status = 'rejected'`.
   - `await appointment.save()` writes the update to MongoDB.
   - **Slot Recycling:** Because the status is now `'rejected'`, it no longer satisfies the `partialFilterExpression: { status: { $in: ['pending', 'accepted', 'completed'] } }` in the compound unique index. The slot is automatically freed for other patients.
5. **Response:** Sets flash message: `"Appointment declined. The slot has been freed up."` and redirects to `/doctor/appointments`.
6. **EJS:** Displays the appointment under "Declined" filter while freeing the slot in the public directory.

---

## 10. Doctor Completes Appointment Flow

1. **Browser:** Doctor clicks "Complete" on an accepted appointment, sending `POST /appointments/:id/complete`.
2. **Route & Middleware:** `requireAuth`, `requireDoctorOrAdmin`.
3. **Controller:** `appointmentController.completeAppointment` runs.
4. **Model & MongoDB:**
   - `Appointment.findById(id)` retrieves the record.
   - Ownership assertion passes.
   - Validates state transition: asserts `appointment.status === 'accepted'`.
   - Updates `appointment.status = 'completed'`.
   - `await appointment.save()` writes to MongoDB.
5. **Response:** Sets success flash message and issues HTTP 302 Redirect to `/doctor/appointments`.
6. **EJS:** The appointment displays with a green `"Completed"` badge and action buttons are replaced with `"No further actions"`.

---

## 11. Appointment History Flow

1. **Browser:** Patient navigates to `/patient/appointments?status=all&page=1`.
2. **Route:** Handled by [routes/patientRoutes.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/routes/patientRoutes.js).
3. **Middleware:** `requireAuth`, `requireRole('patient')`.
4. **Controller:** `patientController.getAppointments` executes.
   - Sets up pagination: `limit = 8`, `skip = (page - 1) * 8`.
   - Builds filter query `{ patientId: req.session.user._id }`.
5. **Model & MongoDB:**
   - `Promise.all` executes:
     1. `Appointment.countDocuments(filter)`
     2. `Appointment.find(filter).sort({ appointmentDate: -1, appointmentTime: -1, createdAt: -1 }).skip(skip).limit(8).populate('doctorId', 'name email').lean()`
   - Batches doctor IDs and fetches specializations from `DoctorProfile` via `$in` to eliminate N+1 queries.
6. **Response:** HTTP 200 `res.render('patient/history', { appointments: enrichedAppointments, pagination, ... })`.
7. **EJS:** `views/patient/history.ejs` renders the paginated appointment table with status badges, doctor names, consultation times, and cancellation options.
