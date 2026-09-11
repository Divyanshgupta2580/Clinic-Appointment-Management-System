# Security Architecture & Implementation

This document details the security controls, authentication mechanisms, authorization boundaries, and defense-in-depth strategies implemented in the MediPulse Clinic Management System.

---

## 1. Authentication & Password Security

### 1.1. Adaptive Password Hashing with Bcrypt
- **Library:** `bcryptjs`
- **Salt Rounds:** `10`
- **Workflow:**
  ```
  Plain Password (Registration)
          │
          ▼
    bcrypt.genSalt(10)
          │
          ▼
    bcrypt.hash(plainPassword, salt)
          │
          ▼
    Stored in MongoDB as 'passwordHash'
  ```
- **Login Verification:** Uses `bcrypt.compare(candidatePassword, storedHash)`, which performs a constant-time comparison to prevent timing-based side-channel attacks.
- **Rule:** Passwords are never logged, stored in plain text, or serialized to frontend views.

---

### 1.2. Session Security
- **Library:** `express-session`
- **Cookie Name:** `medipulse.sid`
- **Security Flags:**
  ```javascript
  cookie: {
    httpOnly: true,                         // Blocks document.cookie access (Mitigates XSS)
    secure: process.env.NODE_ENV === 'production', // Enforces HTTPS transmission in production
    sameSite: 'lax',                        // Mitigates Cross-Site Request Forgery (CSRF)
    maxAge: 24 * 60 * 60 * 1000,           // Expires after 24 hours
  }
  ```
- **Minimal Payload:** Only `_id`, `name`, `email`, and `role` are stored in the session object. Full user documents and password hashes are never stored in session memory.
- **Instant Revocation:** Logout calls `req.session.destroy()` and clears the cookie headers on the client.

---

## 2. Authorization & Access Control

### 2.1. Role-Based Access Control (RBAC)
Endpoints are guarded by modular middleware in `middleware/role.js`:
- `requireAuth`: Ensures user is logged in.
- `requireRole('patient')`: Restricts patient dashboards and booking forms to patients.
- `requireRole('admin')`: Restricts administrative dashboards to admins.
- `requireDoctorOrAdmin`: Grants access to doctors or clinic administrators for clinical scheduling and appointment actions.
- Unauthorized access attempts halt the pipeline and render an HTTP 403 Forbidden page or return 403 JSON.

---

### 2.2. Resource Ownership Verification (Anti-IDOR)
To prevent Insecure Direct Object Reference (IDOR) attacks where a logged-in user manipulates URL parameters to tamper with other users' data, controllers enforce strict ownership checks:
- **Patient Appointment Viewing & Cancellation:** Verified with `appointment.patientId._id.toString() === currentUserId`.
- **Doctor Appointment Management (Accept/Reject/Complete):** Verified with `appointment.doctorId._id.toString() === currentUserId` (unless the user has the `admin` role).
- An authenticated patient attempting to cancel another patient's appointment receives HTTP 403 Forbidden.

---

## 3. Network & Transport Security

### 3.1. HTTP Security Headers (Helmet)
Express integrates Helmet in `app.js`:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing attacks.
- `X-Frame-Options: SAMEORIGIN`: Defends against clickjacking attacks.
- `Strict-Transport-Security` (HSTS): Enforces HTTPS connections in production.
- `X-Download-Options: noopen`: Protects against malicious downloads in older browsers.
- Hides the default `X-Powered-By: Express` header to minimize server fingerprinting.

---

### 3.2. Rate Limiting (Brute-Force Protection)
- **Library:** `express-rate-limit`
- **Scope:** Authentication routes (`/login`, `/register`).
- **Policy:** Maximum 60 requests per 15-minute window per IP.
- **Response:** HTTP 429 Too Many Requests with a friendly notification.

---

## 4. Input Validation & Data Integrity

### 4.1. Server-Side Validation
Implemented in `middleware/validation.js`:
- Name length, email regex format, and minimum password lengths.
- MongoDB ObjectId format verification (`mongoose.Types.ObjectId.isValid()`).
- Strict date format regex (`/^\d{4}-\d{2}-\d{2}$/`) and time format regex (`/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/`).
- Notes/symptoms character length capped at 500 characters.

---

### 4.2. Database-Level Unique Locks
Rather than relying on application code, concurrency safety is enforced at the database engine level:
- Compound unique index on `{ doctorId, appointmentDate, appointmentTime }`.
- Prevents race conditions and duplicate slot allocations.

---

## 5. Information Disclosure Prevention

### 5.1. Centralized Error Masking
- In development, error logs print to standard error for debugging.
- In production, internal error stacks and raw database error messages are stripped from responses; users see clean, branded HTTP 404/500 error pages.
- Authentication failures return generic *"Invalid email or password"* to prevent username harvesting.

---

## 6. Honest Limitations & Future Improvements

1. **In-Memory Session Store:** Development uses the default Express in-memory session store. For distributed multi-instance production, sessions should be backed by a persistent MongoDB session store (`connect-mongo`).
2. **CSRF Tokens:** While `sameSite: 'lax'` cookie policy mitigates cross-site form submissions in modern browsers, adding explicit CSRF tokens (`csurf`) would provide defense-in-depth for legacy clients.
3. **Two-Factor Authentication (2FA):** Medical portals benefit from TOTP (Time-based One-Time Password) for doctor and administrator accounts.
4. **Email Verification:** Accounts are currently active upon registration without an email verification handshake.
