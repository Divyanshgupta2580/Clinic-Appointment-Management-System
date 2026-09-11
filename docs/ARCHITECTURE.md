# Architecture Documentation: MediPulse Clinic Management System

## 1. System Overview

MediPulse Clinic is a clean, server-side rendered (SSR) web application engineered using **Node.js**, **Express.js**, **EJS**, and **MongoDB Atlas** (via **Mongoose ODM**).

```
                          ┌────────────────────────┐
                          │   Client Web Browser   │
                          │ (HTML5 / CSS3 / Vanilla)│
                          └───────────┬────────────┘
                                      │
                         HTTP/HTTPS (Standard GET / POST)
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │            Node.js / Express.js Server           │
             ├──────────────────────────────────────────────────┤
             │ • Security: Helmet, Rate Limiter, Express-Session │
             │ • Auth: Bcrypt Password Hashing, RBAC Middleware │
             │ • View Engine: EJS Server-Side Rendering (SSR)   │
             │ • Scheduling: Slot Engine & Next-Slot Finder     │
             └────────────────────────┬─────────────────────────┘
                                      │
                         Mongoose ODM │ Connection Pooling
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │               MongoDB / MongoDB Atlas            │
             ├──────────────────────────────────────────────────┤
             │ • Users Collection (Email Unique Index)          │
             │ • Doctor Profiles Collection (1-to-1 User Link)  │
             │ • Appointments Collection (Compound Unique Index)│
             │   Index: { doctorId: 1, date: 1, time: 1 }      │
             │   PartialFilter: status ∈ [pending, accepted,    │
             │                            completed]            │
             └──────────────────────────────────────────────────┘
```

---

## 2. Architectural Design Goals

1. **Simplicity Over Complexity:** No unnecessary microservices, WebSockets, messaging queues, or stateful caching layers.
2. **Correctness & Concurrency Control:** Zero double-booking guaranteed at the database engine level via compound unique indexing.
3. **Defense-in-Depth Security:** Granular role-based access control, ownership validation, password hashing, secure session cookies, and HTTP security headers.
4. **Fast Server-Side Rendering:** HTML delivered on the first byte, providing instant page rendering on mobile devices and accessible navigation without complex client JavaScript frameworks.
5. **Transparency & Explainability:** The codebase is organized linearly so a student or developer can trace any request from the route to the database and back in minutes.

---

## 3. Server Startup Lifecycle

The entry point of execution is `server.js`. The startup sequence proceeds through explicit phases:

```
[server.js]
  │
  ├── 1. require('dotenv').config()  --> Injects environment variables from .env
  ├── 2. const app = require('./app') --> Instantiates Express application & middleware stack
  ├── 3. const server = http.createServer(app) --> Wraps Express app in Node HTTP server
  ├── 4. startServer()
  │        ├── await connectDB()     --> Establishes Mongoose pool connection to MongoDB Atlas
  │        └── server.listen(PORT)   --> Starts HTTP server listening for requests
  └── 5. process.on('SIGINT'/'SIGTERM') --> Binds graceful shutdown handlers (closes server & DB)
```

---

## 4. Express Middleware Pipeline (`app.js`)

Requests passing through `app.js` are processed in a strict, sequential order:

```
Incoming HTTP Request
  │
  ├── 1. app.set('trust proxy', 1)        --> Correctly handles reverse proxies (Render, Nginx)
  ├── 2. helmet({...})                     --> Injects security headers (XSS, Clickjacking, MIME)
  ├── 3. express.urlencoded({extended})   --> Parses HTML form data into req.body
  ├── 4. express.json()                    --> Parses JSON API payloads into req.body
  ├── 5. express.static(path)             --> Serves public assets (CSS, client JS, images)
  ├── 6. session({...})                    --> Manages secure, signed session cookies (medipulse.sid)
  ├── 7. sessionLocals                     --> Exposes req.session.user & flash data to EJS templates
  ├── 8. Route Handlers:
  │        ├── app.use('/', indexRoutes)
  │        ├── app.use('/auth', authRoutes)
  │        ├── app.use('/patient', patientRoutes)
  │        ├── app.use('/doctor', doctorRoutes)
  │        ├── app.use('/admin', adminRoutes)
  │        └── app.use('/appointments', appointmentRoutes)
  ├── 9. notFoundHandler                  --> Catches unmatched routes, rendering 404.ejs
  └── 10. errorHandler                   --> Centralized error handler, rendering 500.ejs
```

---

## 5. Request-to-Database Flow

The primary application flow is:

```
Browser
  ↓
Express Route
  ↓
Middleware (Authentication, Role, Validation)
  ↓
Controller (Business Logic)
  ↓
Mongoose Model
  ↓
MongoDB Atlas
  ↓
Controller
  ↓
EJS Response / HTTP Redirect
```

No unnecessary layers (DTOs, factories, service repositories, microservices) exist.

---

## 6. Architectural Decision on WebSockets

Earlier revisions considered using WebSockets and Socket.IO. After evaluating the problem statement requirements, WebSockets were **completely removed**:
- **Why?** A clinic appointment booking system is transactional. Patients do not need live sub-second websocket streaming; when a doctor accepts an appointment, the patient sees the updated status upon visiting their dashboard or refreshing.
- **Benefits of Removal:**
  - Zero open TCP socket memory overhead.
  - Zero complex room registration, disconnect, or reconnection logic.
  - No need for Redis pub/sub adapters when scaling across multiple server instances.
  - Codebase is significantly simpler, easier to debug, and 100% defensible during evaluation.
