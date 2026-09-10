# Teacher & Judge Explanation Guide (Viva Preparation)

Welcome! This guide is written like an interview and viva coach. It gives you the exact words, technical explanations, architectural arguments, and code pointers to confidently present MediPulse Clinic to your college teacher, external examiner, or hackathon judges.

---

## 1. Verbal Pitches (Spoken Scripts)

### 30-Second Elevator Pitch
> *"MediPulse Clinic is a full-stack appointment management system engineered for small clinics. Patients can browse verified physicians, check real-time availability, and book consultation slots. The core technical highlight is **database-level double-booking prevention**: we use a MongoDB compound unique index with partial filtering so race conditions are impossible even under concurrent load. When a conflict occurs, our scheduling algorithm immediately recommends the next available opening, and doctor actions update the patient's screen in real time using room-isolated Socket.IO WebSockets."*

### 1-Minute Pitch
> *"Our project addresses Problem Statement 1 in the healthcare domain. In medical scheduling, a common flaw is application-level 'check-then-insert' logic, which fails when two patients attempt to book the same doctor and slot simultaneously.
> 
> To solve this, MediPulse implements concurrency control at the database storage engine level using a compound unique index on Doctor ID, Appointment Date, and Appointment Time. We combine this with a partial filter expression so cancelled and rejected slots are instantly recycled for other patients.
> 
> The system features full Role-Based Access Control for Patients, Doctors, and Administrators with bcrypt password hashing and session management. It uses server-side rendered EJS for fast, accessible initial page loads, and Socket.IO to push live updates—such as appointment confirmations or cancellations—directly to the user's browser without requiring a page refresh. All of this was verified through a complete 4-part automated testing suite."*

### 3-Minute Comprehensive Presentation
> *"Good morning/afternoon. Today I am presenting MediPulse Clinic, an end-to-end clinical appointment management platform.
> 
> When looking at existing small-clinic booking systems, we identified three critical problems:
> 1. Double-booking due to race conditions during simultaneous booking attempts.
> 2. Slow communication where patients must manually refresh pages to see if their doctor approved an appointment.
> 3. Rigid slot management where cancelled appointments leave dead time slots.
> 
> **Architecture & Tech Stack:**
> We selected a Node.js and Express backend with Server-Side Rendered EJS templates, MongoDB with Mongoose, and Socket.IO for WebSockets. We chose SSR because healthcare applications prioritize instant load times, SEO, and accessibility on mobile devices without demanding heavy JavaScript compilation on low-powered client devices.
> 
> **How We Solved Double-Booking:**
> Many developers simply run a `findOne` query and then an `insert`. In high concurrency, both requests pass the check before either writes, resulting in two patients showing up for the same 10:00 AM slot. We moved this constraint directly into the MongoDB engine using a compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`. If a collision occurs, MongoDB atomically throws an `E11000 duplicate key error`. Our controller catches this error and triggers our smart fallback algorithm, which calculates the doctor's next free slot today or over the next 7 days and presents a one-click rebooking button.
> 
> Furthermore, by utilizing a Mongoose `partialFilterExpression` on active statuses (`pending`, `accepted`, `completed`), rejected and cancelled appointments are automatically excluded from the unique constraint, allowing another patient to claim the slot immediately while preserving the audit record.
> 
> **Real-Time Communication:**
> We use Socket.IO with room isolation. Instead of broadcasting to all users, patients join a private room `user:<id>`, doctors join `doctor:<id>`, and administrators join `role:admin`. When a doctor clicks 'Accept', an event is routed specifically to that patient's room, updating their UI status badge live and popping up a toast notification.
> 
> **Verification & Testing:**
> We wrote and verified four automated test suites: mathematical unit tests for slot intervals, a database concurrency test that fires simultaneous duplicate bookings to prove `E11000` is caught, a 15-step end-to-end integration test covering all RBAC scenarios, and a WebSocket test proving room isolation.
> 
> I am ready to walk you through the codebase and demonstrate any feature live."*

---

## 2. "Why" Explanations: Defending Your Technical Choices

### Why Node.js & Express?
- **Teacher asks:** *"Why didn't you use Django, Spring Boot, or PHP?"*
- **You say:** *"Node.js operates on a single-threaded, non-blocking, event-driven I/O model. In an appointment system, the server spends most of its time waiting on database queries and WebSocket connections. Node's asynchronous event loop handles high numbers of concurrent I/O operations with very low memory overhead compared to thread-per-request architectures like Spring Boot."*

### Why EJS & Server-Side Rendering (SSR)?
- **Teacher asks:** *"Why didn't you use React, Vue, or Next.js?"*
- **You say:** *"Single Page Applications introduce significant overhead: client-side routing state, complex build pipelines, large JavaScript bundles, and blank loading states. For a clinic management system, SSR delivers fully rendered semantic HTML on the very first byte. This improves initial load performance on mobile devices and simplifies state management. We then progressively enhanced the UI with lightweight vanilla JavaScript for dynamic slot picking and Socket.IO for real-time updates."*

### Why MongoDB & Mongoose?
- **Teacher asks:** *"Why not PostgreSQL or MySQL?"*
- **You say:** *"MongoDB provides flexible, schema-validated JSON-like documents that map naturally to JavaScript objects. More importantly, MongoDB's WiredTiger storage engine provides native compound unique indexing with partial filter expressions (`partialFilterExpression`), which allowed us to implement our conditional uniqueness rule on active appointment slots without writing complex database triggers or table partitions."*

### Why Session-Based Auth instead of JWT?
- **Teacher asks:** *"Why didn't you use JWT (JSON Web Tokens)?"*
- **You say:** *"JWTs stored in browser `localStorage` are vulnerable to Cross-Site Scripting (XSS) token theft. Furthermore, JWTs are inherently stateless and cannot be revoked server-side without building a Redis token blacklist. By using `express-session` with `httpOnly: true` and `sameSite: 'lax'` signed cookies, JavaScript cannot access the session token, and a doctor or administrator can be revoked immediately on the server by calling `req.session.destroy()`."*

### Why Bcrypt with 10 Salt Rounds?
- **Teacher asks:** *"Why not SHA-256 or MD5?"*
- **You say:** *"SHA-256 and MD5 are general-purpose cryptographic hash functions designed to be fast. Fast hashing algorithms are vulnerable to brute-force attacks using modern GPUs. Bcrypt is a slow, CPU-adaptive key derivation function based on the Blowfish cipher. It incorporates an automatic salt to prevent rainbow table attacks and introduces a tunable work factor (10 rounds = $2^{10}$ iterations), ensuring password hashing remains computationally resistant to offline cracking."*

---

## 3. Step-by-Step Request Lifecycle Explanations

### Flow 1: Patient Books an Appointment
1. **User Action:** The patient selects Dr. Sarah, chooses `2026-11-20`, clicks the `09:00` slot button, and clicks "Confirm & Book".
2. **Browser:** Submits `POST /appointments/book` with form payload `{ doctorId, appointmentDate, appointmentTime, notes }`.
3. **Middleware:**
   - `requireAuth`: Verifies `req.session.user` exists.
   - `requireRole('patient')`: Verifies the user has the patient role.
   - `validateAppointment`: Validates doctor ObjectId, date format (`YYYY-MM-DD`), and time format (`HH:MM`).
4. **Controller (`appointmentController.bookAppointment`):**
   - Directly executes `Appointment.create({ patientId, doctorId, appointmentDate, appointmentTime, status: 'pending' })`.
5. **Database:**
   - MongoDB evaluates the compound index `unique_doctor_slot_active`.
   - No conflicting active appointment exists; the document is written to the `appointments` collection.
6. **Socket.IO:**
   - Controller calls `emitAppointmentCreated(appointment)`.
   - Server emits `appointment:created` to room `doctor:<doctorId>`.
7. **Response:** Server issues HTTP 302 Redirect to `/patient/appointments` with flash success message.
8. **Doctor Screen:** Doctor's browser receives the WebSocket event and immediately displays a toast notification and updates the dashboard.

### Flow 2: Concurrent Duplicate Booking Attempt (Double-Booking Conflict)
1. **User Action:** Patient B attempts to book the exact same doctor at `2026-11-20` at `09:00` after Patient A just booked it.
2. **Controller:** Executes `Appointment.create(...)`.
3. **Database:**
   - MongoDB detects a collision on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`.
   - WiredTiger rejects the insert and throws `MongoServerError: E11000 duplicate key error`.
4. **Controller Conflict Handler:**
   - Catches `err.code === 11000`.
   - Calls `findNextAvailableSlot(doctorId, '2026-11-20', '09:00')`.
   - Slot utility finds `09:30` is free.
5. **Response:** Server renders the booking page with an alert: *"This time slot was just booked by another patient"* and attaches an actionable button: *"Book Suggested Slot: 2026-11-20 at 09:30"*.

### Flow 3: Doctor Accepts Appointment
1. **User Action:** Doctor clicks "Accept" next to a pending appointment.
2. **Browser:** Submits `POST /appointments/:id/accept`.
3. **Controller (`appointmentController.acceptAppointment`):**
   - Verifies the logged-in doctor owns this appointment (`appointment.doctorId.toString() === currentUserId`).
   - Verifies state transition is valid (`status === 'pending'`).
   - Updates `appointment.status = 'accepted'` and calls `appointment.save()`.
   - Calls `emitAppointmentAccepted(...)`.
4. **Socket.IO:** Emits `appointment:accepted` to room `user:<patientId>`.
5. **Response:** HTTP 302 Redirect to `/doctor/appointments`.
6. **Patient Screen:** Patient's browser receives the event; `public/js/realtime.js` dynamically flips the status badge from "Pending Review" to "Confirmed / Accepted" without reloading the page.

---

## 4. "Show Me The Code" Questions (Exact Pointer Reference)

When your teacher or judge asks to see specific code, open these exact files and say these exact phrases:

### 1. "Show me where you connect to MongoDB."
- **File:** `config/db.js`
- **Lines:** 10–37 (`connectDB` function)
- **What to say:** *"Here in `config/db.js`, we read `process.env.MONGODB_URI` and connect via `mongoose.connect()`. Notice we configure a 5000ms server selection timeout and attach connection lifecycle listeners for 'error' and 'disconnected' events."*

### 2. "Show me where passwords are hashed."
- **File:** `models/User.js`
- **Lines:** 45–49 (`User.hashPassword` static method)
- **What to say:** *"In `models/User.js`, we define a static helper `User.hashPassword` that generates a salt using 10 rounds of bcrypt and returns the hash. In `authController.js` line 108, this is called before creating the user document."*

### 3. "Show me how role-based authorization works."
- **File:** `middleware/role.js`
- **Lines:** 5–35 (`requireRole` higher-order function)
- **What to say:** *"In `middleware/role.js`, `requireRole` takes an array of permitted roles. If `req.session.user.role` does not match, it blocks execution and renders our custom `errors/403` view with HTTP status 403 Forbidden."*

### 4. "Show me the unique index that prevents double booking."
- **File:** `models/Appointment.js`
- **Lines:** 53–65
- **What to say:** *"Right here in `models/Appointment.js`. We define a compound index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` with `unique: true`. Crucially, we use a `partialFilterExpression` on statuses `['pending', 'accepted', 'completed']`. This ensures cancelled and rejected appointments release the slot for new bookings while maintaining medical records."*

### 5. "Show me how double booking is caught and handled."
- **File:** `controllers/appointmentController.js`
- **Lines:** 59–90
- **What to say:** *"In `bookAppointment`, we wrap `Appointment.create()` in a try/catch block. If MongoDB throws error code 11000, we catch it, invoke `findNextAvailableSlot()`, and return a 409 Conflict with the recommended opening."*

### 6. "Show me where the next available slot is calculated."
- **File:** `utils/slotUtils.js`
- **Lines:** 105–146 (`findNextAvailableSlot` function)
- **What to say:** *"In `utils/slotUtils.js`, `findNextAvailableSlot` first inspects later slots on the same day. If none are open, it iterates up to 7 subsequent calendar days using UTC date math, checking doctor availability days and finding the first open slot."*

### 7. "Show me where Socket.IO starts and sets up rooms."
- **File:** `sockets/socket.js`
- **Lines:** 8–49 (`initSocket` function)
- **What to say:** *"In `sockets/socket.js`, `initSocket` attaches to the HTTP server. On connection, it reads authentication credentials and automatically joins the socket to room `user:<userId>` and `doctor:<doctorId>`."*

### 8. "Show me how the client receives the WebSocket event and updates the page."
- **File:** `public/js/realtime.js`
- **Lines:** 78–101 (`updateAppointmentStatusInDOM`) and 120–125 (`appointment:accepted`)
- **What to say:** *"In `public/js/realtime.js`, the browser listens for `appointment:accepted`. When received, it queries the DOM for elements with `data-appointment-id` matching the appointment and dynamically changes the badge class and text to 'Confirmed / Accepted'."*

### 9. "Show me the centralized error handler."
- **File:** `middleware/errorHandler.js`
- **Lines:** 22–72 (`errorHandler`)
- **What to say:** *"In `middleware/errorHandler.js`, our 4-argument error middleware handles Mongoose CastErrors, ValidationErrors, and general exceptions. It logs the stack trace server-side in development, but renders a clean user-facing error view with status 500 in production."*

---

## 5. Top 40 Teacher / Examiner Viva Questions & Answers

### Group A: General Project & Architecture
1. **Q: What is the main objective of this project?**  
   *Answer:* To provide a full-stack clinical appointment scheduling system for patients and physicians that guarantees zero double-booking at the database level and provides live status updates via WebSockets.  
   *Code:* `README.md`, `app.js`

2. **Q: What architecture pattern does this project follow?**  
   *Answer:* The Model-View-Controller (MVC) architectural pattern combined with an event-driven WebSocket broker.  
   *Code:* `models/`, `views/`, `controllers/`, `sockets/`

3. **Q: Why did you separate `server.js` and `app.js`?**  
   *Answer:* Separation of concerns. `app.js` configures Express middlewares and routing logic, while `server.js` manages networking, protocol binding, database bootstrapping, and graceful shutdown signals.  
   *Code:* `app.js`, `server.js`

4. **Q: How does the application handle graceful shutdown?**  
   *Answer:* In `server.js`, we listen for `SIGINT` and `SIGTERM`, stop accepting new HTTP connections via `server.close()`, and close MongoDB connections via `closeDB()` with a 10-second timeout.  
   *Code:* `server.js:37-53`

### Group B: Node.js & Express
5. **Q: What is middleware in Express?**  
   *Answer:* Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the `next` middleware function in the application’s request-response cycle.  
   *Code:* `middleware/auth.js`, `middleware/role.js`

6. **Q: What is `app.set('trust proxy', 1)` for?**  
   *Answer:* It tells Express that it is behind a reverse proxy (like Render, Nginx, or AWS ALB), allowing it to trust the `X-Forwarded-*` headers for HTTPS detection and real client IP rate limiting.  
   *Code:* `app.js:21`

7. **Q: What is `asyncHandler`?**  
   *Answer:* A higher-order function that wraps asynchronous Express route handlers and forwards any unhandled Promise rejections directly to Express's `next(err)` error pipeline.  
   *Code:* `utils/asyncHandler.js`

8. **Q: How are static files served?**  
   *Answer:* Through `express.static(path.join(__dirname, 'public'))`, which serves stylesheets, client scripts, and images.  
   *Code:* `app.js:33`

### Group C: EJS & Frontend
9. **Q: What is Server-Side Rendering (SSR)?**  
   *Answer:* The server processes data, interpolates it into an HTML template, and transmits complete HTML to the browser, eliminating client-side rendering latency.  
   *Code:* `views/`

10. **Q: How do you share user information across all EJS templates?**  
    *Answer:* Using `sessionLocals` middleware in `app.js`, which binds `req.session.user` and flash messages to `res.locals`, making them accessible to all templates automatically.  
    *Code:* `middleware/auth.js:43-65`

11. **Q: How do partials work in EJS?**  
    *Answer:* They allow reusable components (such as headers, navigation bars, footers, and flash banners) to be included in templates via `<%- include('./partials/header') %>`.  
    *Code:* `views/partials/`

12. **Q: Where is client-side JavaScript used?**  
    *Answer:* Only for progressive enhancements: `booking.js` for asynchronous slot fetching and `realtime.js` for WebSocket notifications and DOM updates.  
    *Code:* `public/js/`

### Group D: MongoDB & Mongoose
13. **Q: What is Mongoose ODM?**  
    *Answer:* An Object Data Modeling library for MongoDB that provides schema validation, type casting, middleware hooks, and business logic methods.  
    *Code:* `models/`

14. **Q: What are the three primary database models?**  
    *Answer:* `User` (credentials and roles), `DoctorProfile` (specialization, qualifications, working hours), and `Appointment` (bookings and statuses).  
    *Code:* `models/`

15. **Q: How are dates and times stored in appointments?**  
    *Answer:* As ISO strings `YYYY-MM-DD` and 24-hour strings `HH:MM` to prevent timezone offsets from shifting appointment days across midnight.  
    *Code:* `models/Appointment.js:18-26`

16. **Q: What happens if MongoDB disconnects while the server is running?**  
    *Answer:* The connection listeners in `config/db.js` log the disconnection, and Mongoose attempts auto-reconnection while queuing write operations.  
    *Code:* `config/db.js:27-30`

### Group E: Double Booking & Concurrency
17. **Q: Why is `Appointment.findOne()` before `create()` dangerous?**  
    *Answer:* It creates a Time-of-Check to Time-of-Use race condition. Two concurrent requests will both find no appointment and both insert, causing double booking.  
    *Code:* `controllers/appointmentController.js`

18. **Q: How did you solve the race condition?**  
    *Answer:* With a MongoDB compound unique index on `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`. MongoDB guarantees atomicity at the storage engine level.  
    *Code:* `models/Appointment.js:53-65`

19. **Q: What error does MongoDB throw when a double booking is attempted?**  
    *Answer:* `MongoServerError: E11000 duplicate key error`.  
    *Code:* `controllers/appointmentController.js:61`

20. **Q: How do cancelled appointments become available again?**  
    *Answer:* The index uses a `partialFilterExpression: { status: { $in: ['pending', 'accepted', 'completed'] } }`. Cancelled and rejected appointments are excluded from the index, immediately freeing the slot.  
    *Code:* `models/Appointment.js:61-64`

### Group F: Next Available Slot Logic
21. **Q: How does the system suggest the next available slot?**  
    *Answer:* `findNextAvailableSlot` searches later available slots on the same date. If none exist, it searches up to 7 subsequent calendar days against the doctor's active days.  
    *Code:* `utils/slotUtils.js:105-146`

22. **Q: How is day-of-week calculated reliably?**  
    *Answer:* Using `Date.UTC(year, month - 1, day)` in `getDayOfWeek`, ensuring the day is evaluated in UTC without local machine timezone drift.  
    *Code:* `utils/slotUtils.js:39-45`

### Group G: Authentication & Sessions
23. **Q: How is session state maintained?**  
    *Answer:* Via signed HTTP cookies storing a session ID (`medipulse.sid`). The server looks up the user data corresponding to that session ID.  
    *Code:* `app.js:41-53`

24. **Q: Why is `httpOnly: true` used for cookies?**  
    *Answer:* It prevents client-side JavaScript from accessing `document.cookie`, mitigating cookie theft through XSS vulnerabilities.  
    *Code:* `app.js:47`

25. **Q: What does `sameSite: 'lax'` do?**  
    *Answer:* It ensures cookies are not sent on cross-site subrequests (such as embedded images), protecting against Cross-Site Request Forgery (CSRF).  
    *Code:* `app.js:49`

26. **Q: What happens on logout?**  
    *Answer:* `req.session.destroy()` destroys the server session and `res.clearCookie('medipulse.sid')` removes the cookie from the user's browser.  
    *Code:* `controllers/authController.js:155-167`

### Group H: Role-Based Access Control (RBAC)
27. **Q: What roles exist in the system?**  
    *Answer:* `patient`, `doctor`, and `admin`.  
    *Code:* `models/User.js:30`

28. **Q: What is the difference between 401 and 403?**  
    *Answer:* 401 Unauthorized means the user is not logged in (missing authentication). 403 Forbidden means the user is logged in, but their role lacks permission to access the resource.  
    *Code:* `middleware/auth.js`, `middleware/role.js`

29. **Q: Can a patient book an appointment as a doctor?**  
    *Answer:* No. The booking route `/appointments/book` is explicitly guarded by `requireRole('patient')`.  
    *Code:* `routes/appointmentRoutes.js:11`

### Group I: Socket.IO & Real-Time
30. **Q: What protocol does Socket.IO use?**  
    *Answer:* It uses WebSockets as the primary transport protocol, with HTTP long-polling as a fallback.  
    *Code:* `sockets/socket.js`

31. **Q: Why are rooms used in Socket.IO?**  
    *Answer:* Rooms partition connected clients so that private notifications are routed only to the intended recipient (`user:<patientId>` or `doctor:<doctorId>`) rather than globally.  
    *Code:* `sockets/socket.js:16-46`

32. **Q: What events are emitted when a doctor accepts an appointment?**  
    *Answer:* The server emits `appointment:accepted` to room `user:<patientId>`, carrying the appointment ID, doctor name, date, and time.  
    *Code:* `sockets/socket.js:81-92`

### Group J: Security & Protection
33. **Q: How is brute-force attack prevented on login?**  
    *Answer:* Through `express-rate-limit`, which caps authentication requests at 60 attempts per 15-minute window per IP.  
    *Code:* `middleware/rateLimiter.js`

34. **Q: How is SQL/NoSQL Injection prevented?**  
    *Answer:* Mongoose schemas enforce strict type validation (e.g. ObjectIds must be valid hex strings), and queries use object parameters rather than concatenated strings.  
    *Code:* `middleware/validation.js`

35. **Q: What security headers does Helmet apply?**  
    *Answer:* `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), and `Strict-Transport-Security` (HTTPS enforcement).  
    *Code:* `app.js:22-26`

### Group K: Performance & Optimization
36. **Q: What is `.lean()` in Mongoose queries?**  
    *Answer:* It returns plain JavaScript objects instead of heavy Mongoose documents, saving memory and speeding up execution for read-only queries.  
    *Code:* `controllers/patientController.js:24`

37. **Q: How did you prevent N+1 queries on the patient dashboard?**  
    *Answer:* By extracting doctor IDs from appointments, fetching their profiles in a single `$in` query, and mapping them using a JavaScript `Map`.  
    *Code:* `controllers/patientController.js:28-39`

### Group L: Testing & Verification
38. **Q: How do you know double-booking prevention works?**  
    *Answer:* We executed `scripts/testDoubleBooking.js`, which fires two concurrent bookings for the exact same slot; the second is rejected by MongoDB with error 11000.  
    *Code:* `scripts/testDoubleBooking.js`

39. **Q: How many steps are verified in your integration test?**  
    *Answer:* 15 distinct steps covering registration, authentication, RBAC violations, doctor directory search, slot querying, booking, 409 conflict, accept, and complete.  
    *Code:* `scripts/testIntegration.js`

40. **Q: What would you improve if given another week?**  
    *Answer:* Add persistent Redis session storage, email/SMS reminders via Twilio/SendGrid, online payment processing via Stripe, and multi-clinic organization support.  
    *Code:* `README.md`

---

## 6. Real-World Analogies for Complex Concepts

- **Session vs JWT:**  
  *"A session is like a hotel room key card: the hotel's computer knows which room is yours, and if you lose it, the front desk can deactivate it immediately. A JWT is like a stamped paper ticket: anyone holding it can enter until the time expires, even if you want to cancel it."*
- **Compound Unique Index:**  
  *"Like airline seat assignments: row 14, seat B on Flight 102 can only belong to one boarding pass. If two people try to claim Seat 14B on Flight 102, the reservation system rejects the second one instantly."*
- **Partial Filter Expression:**  
  *"Like reserving a hotel room: as long as a guest is checked in or has an active reservation, no one else can book that room. But if the guest cancels, the room is immediately visible on the booking website again, while the cancellation receipt stays in the clinic's filing cabinet for accounting."*
- **Socket.IO Rooms:**  
  *"Like an intercom system in a hospital: instead of announcing over the main lobby loudspeakers that Patient John's prescription is ready, the nurse speaks directly into the intercom speaker in Room 204."*

---

## 7. "Do NOT Say This" Section (Common Student Mistakes)

| DO NOT SAY | WHY IT IS WRONG | WHAT YOU SHOULD SAY INSTEAD |
| :--- | :--- | :--- |
| *"The database is encrypted end-to-end."* | Standard MongoDB is encrypted in transit (TLS) and at rest (disk), but application fields are not client-side encrypted unless CSFLE is enabled. | *"Passwords are cryptographically hashed using salted bcrypt, and connections use TLS encryption."* |
| *"Socket.IO guarantees database consistency."* | Socket.IO is merely a transport protocol for messaging; it has nothing to do with database consistency. | *"MongoDB enforces database consistency via unique compound indexes; Socket.IO merely notifies connected clients after a database write succeeds."* |
| *"We used React for the frontend."* | There is zero React in this project. It uses server-side rendered EJS templates. | *"We used server-side rendered EJS templates for fast initial loading and progressive enhancement with vanilla JavaScript."* |
| *"Our server is microservices-based."* | The application is a well-structured, modular monolithic MVC system. | *"We designed a modular MVC architecture that can be horizontally scaled or decomposed into microservices in the future."* |
| *"We checked if the slot was free using findOne before booking."* | That is the buggy check-then-insert pattern! | *"We let the database enforce the constraint directly during insertion to prevent race conditions, and caught error code 11000."* |
