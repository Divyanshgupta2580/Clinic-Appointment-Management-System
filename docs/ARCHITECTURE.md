# Architecture Documentation: MediPulse Clinic Management System

## 1. System Overview

MediPulse Clinic is a full-stack, server-side rendered (SSR) web application engineered using Node.js, Express.js, EJS, MongoDB (Mongoose ODM), and Socket.IO.

```
                          ┌────────────────────────┐
                          │   Client Web Browser   │
                          │ (HTML5 / CSS3 / Vanilla)│
                          └───────────┬────────────┘
                                      │
            HTTP/HTTPS (SSR / REST API)│ Socket.IO (WebSockets)
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │            Node.js / Express.js Server           │
             ├──────────────────────────────────────────────────┤
             │ • Security: Helmet, Rate Limiter, Express-Session │
             │ • Auth: Bcrypt Password Hashing, RBAC Middleware │
             │ • Real-time: Room-Isolated Socket.IO Broker       │
             │ • Logic: Slot Engine & Next-Available Finder     │
             └────────────────────────┬─────────────────────────┘
                                      │
                         Mongoose ODM │ Connection Pooling
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │               MongoDB / MongoDB Atlas            │
             ├──────────────────────────────────────────────────┤
             │ • Users Collection (Email Unique Index)          │
             │ • Doctor Profiles Collection                     │
             │ • Appointments Collection (Compound Unique Index)│
             │   Index: { doctorId: 1, date: 1, time: 1 }      │
             │   PartialFilter: status ∈ [pending, accepted,    │
             │                            completed]            │
             └──────────────────────────────────────────────────┘
```

---

## 2. Server Startup Lifecycle

The entry point of execution is `server.js`. The startup sequence proceeds through explicit phases:

```
[server.js]
  │
  ├── 1. require('dotenv').config()  --> Injects environment variables from .env
  ├── 2. const app = require('./app') --> Instantiates Express application & middleware stack
  ├── 3. const server = http.createServer(app) --> Wraps Express app in Node HTTP server
  ├── 4. initSocket(server)           --> Binds Socket.IO instance to HTTP server
  ├── 5. startServer()
           │
           ├── 5a. connectDB()       --> Connects to MongoDB with 5000ms selection timeout
           └── 5b. server.listen(PORT) --> Binds port 3000 and begins accepting requests
```

### Express Middleware Order of Execution (`app.js`):
1. `app.set('trust proxy', 1)`: Prepares Express to trust incoming proxy headers (`X-Forwarded-For`, `X-Forwarded-Proto`).
2. `helmet()`: Sets protective HTTP security headers (disabling CSP to allow Google Fonts and client scripts).
3. `express.urlencoded({ extended: true })`: Parses HTML form submissions (`application/x-www-form-urlencoded`).
4. `express.json()`: Parses JSON request bodies for REST API endpoints.
5. `express.static('public')`: Serves static assets (`/css/styles.css`, `/js/realtime.js`, `/js/booking.js`).
6. `app.set('view engine', 'ejs')`: Registers the EJS rendering engine.
7. `session(...)`: Configures session middleware using signed cookie `medipulse.sid`.
8. `sessionLocals`: Injects `currentUser` and flash messages into `res.locals` so all templates have access without controller boilerplate.
9. Route routers:
   - `/`: `indexRoutes` (Landing page, auth aliases, slot API)
   - `/auth`: `authRoutes` (Login, Register, Logout)
   - `/patient`: `patientRoutes` (Dashboard, Doctor catalog, History)
   - `/doctor`: `doctorRoutes` (Dashboard, Appointments, Schedule settings)
   - `/admin`: `adminRoutes` (Admin metrics)
   - `/appointments`: `appointmentRoutes` (Booking, Accept, Reject, Complete, Cancel)
10. `notFoundHandler`: Catches unmatched routes and renders `errors/404` or returns JSON 404.
11. `errorHandler`: Centralized error catching for unhandled errors, MongoDB validation errors, and `CastError` exceptions.

---

## 3. Server-Client Boundary & Rendering Strategy

### Server-Side Rendering (SSR) with EJS
The application predominantly relies on SSR:
1. Browser issues an HTTP `GET` request.
2. Express route activates middleware (`requireAuth`, `requireRole`).
3. Controller executes database queries via Mongoose (`lean()` read operations).
4. Controller calls `res.render('view', data)`.
5. Express interpolates data into the EJS template and responds with complete, semantic HTML.
6. Browser renders HTML instantly without requiring client-side JS compilation or hydration.

### Client-Side JavaScript Responsibilities
Client-side JavaScript is strictly scoped to progressive enhancement:
- `public/js/booking.js`:
  - Listens for date picker changes.
  - Asynchronously queries `/api/doctors/:id/available-slots?date=YYYY-MM-DD`.
  - Dynamically renders interactive slot buttons (`is-taken` vs available).
  - Updates hidden form input `#appointmentTime` upon selection.
- `public/js/realtime.js`:
  - Connects to Socket.IO using `window.CURRENT_USER` context injected by `header.ejs`.
  - Listens for incoming appointment status events.
  - Dynamically updates the table row status badge in the DOM.
  - Displays transient toast alert notifications.

---

## 4. Real-Time Socket.IO Architecture

Socket.IO operates alongside the HTTP server using the same port (3000).

```
          [Client A: Patient]             [Client B: Doctor]
                  │                               │
       ws://connect (auth: userId)     ws://connect (auth: userId)
                  │                               │
                  ▼                               ▼
       ┌─────────────────────────────────────────────────────┐
       │             Socket.IO Server Broker                 │
       │                   (sockets/socket.js)               │
       ├─────────────────────────────────────────────────────┤
       │ Room: user:patient_123      Room: doctor:doc_456    │
       │ Room: role:admin                                    │
       └─────────────────────────────────────────────────────┘
```

### Event Flow: Patient Books Appointment
```
1. Patient submits POST /appointments/book (HTTP)
2. appointmentController writes appointment to MongoDB
3. appointmentController calls emitAppointmentCreated(appointment)
4. Socket.IO emits 'appointment:created' to rooms:
   - 'doctor:<doctorId>'
   - 'role:admin'
5. Doctor's browser receives event -> Toast notification appears + Live DOM banner
```

### Event Flow: Doctor Accepts Appointment
```
1. Doctor submits POST /appointments/:id/accept (HTTP)
2. appointmentController updates status = 'accepted' in MongoDB
3. appointmentController calls emitAppointmentAccepted(appointment)
4. Socket.IO emits 'appointment:accepted' to room:
   - 'user:<patientId>'
5. Patient's browser receives event -> Toast notification + Status badge changes from 'Pending Review' to 'Confirmed / Accepted' without reload
```

---

## 5. Concurrency & Data Flow: Double-Booking Prevention

```
[Patient A Request: 10:00]          [Patient B Request: 10:00]
            │                                   │
   POST /appointments/book             POST /appointments/book
            │                                   │
            ▼                                   ▼
 appointmentController.js            appointmentController.js
            │                                   │
   Appointment.create(...)             Appointment.create(...)
            │                                   │
            └───────────────┬───────────────────┘
                            ▼
               ┌────────────────────────┐
               │ MongoDB Storage Engine │
               │ (WiredTiger B-Tree)    │
               └────────────┬───────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    [First Request]                 [Second Request]
   Index entry written              Unique index collision!
            │                               │
      HTTP 302 Redirect               E11000 Error Thrown
      Success Flash Message                 │
                                            ▼
                              appointmentController catches E11000
                                            │
                              findNextAvailableSlot(...) runs
                                            │
                                            ▼
                              HTTP 409 Conflict + Next Slot Suggestion
```

---

## 6. Request Lifecycle Reference

### Flow: Patient Registration
1. **Browser**: Submits `POST /auth/register` with `name`, `email`, `password`, `role=patient`.
2. **Middleware**:
   - `authLimiter`: Checks IP rate limits.
   - `validateRegister`: Validates input lengths and email regex.
3. **Controller** (`authController.postRegister`):
   - Queries `User.findOne({ email })` to check duplication.
   - Calls `User.hashPassword(password)` (bcrypt 10 rounds).
   - Calls `User.create(...)`.
   - Initializes `req.session.user`.
4. **Response**: HTTP 302 Redirect to `/patient/dashboard`.

### Flow: Doctor Profile & Schedule Update
1. **Browser**: Submits `POST /doctor/profile` with working hours and active days.
2. **Middleware**: `requireAuth` + `requireDoctorOrAdmin`.
3. **Controller** (`doctorController.updateProfile`):
   - Calls `DoctorProfile.findOneAndUpdate({ userId }, updates, { upsert: true })`.
4. **Response**: HTTP 302 Redirect to `/doctor/profile` with success flash message.
