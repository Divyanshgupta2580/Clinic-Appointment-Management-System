# Security Architecture & Audit: MediPulse Clinic

This document outlines the security controls, authentication safeguards, data isolation policies, and production configurations implemented across the application.

---

## 1. Authentication & Password Security

### 1.1 Bcrypt Password Hashing
- **Algorithm:** Salted Blowfish cipher via `bcryptjs`.
- **Work Factor / Rounds:** 10 salt rounds (`await bcrypt.genSalt(10)`).
- **Implementation:** Encapsulated inside `models/User.js`:
  - `User.hashPassword(plainPassword)`: Generates a cryptographically strong salt and hashes the plaintext password before storage.
  - `user.comparePassword(candidatePassword)`: Uses constant-time comparison to prevent timing attacks.
- **Invariant:** Plaintext passwords are never written to MongoDB, never cached in memory, and never logged to stdout or log files.

---

## 2. Session & Cookie Security

### 2.1 Session Configuration (`app.js`)
```javascript
app.use(
  session({
    name: 'medipulse.sid', // Custom cookie name hides underlying technology
    secret: process.env.SESSION_SECRET || 'dev_clinic_appointment_system_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,                               // Prevents XSS attacks from reading session cookies
      secure: process.env.NODE_ENV === 'production',// Enforces HTTPS-only transmission in production
      sameSite: 'lax',                              // Protects against Cross-Site Request Forgery (CSRF)
      maxAge: 24 * 60 * 60 * 1000,                  // 24-hour expiration window
    },
  })
);
```

### 2.2 Reverse Proxy Trust
- `app.set('trust proxy', 1)` is enabled in `app.js`.
- When deployed behind reverse proxies (Render, AWS ALB, Nginx, Cloudflare), this allows Express to read the true client IP (`X-Forwarded-For`) for accurate rate limiting and recognize SSL termination (`X-Forwarded-Proto`).

---

## 3. Role-Based Access Control (RBAC)

The application enforces three distinct roles (`patient`, `doctor`, `admin`) with zero cross-role privilege escalation:

### 3.1 Protection Guards
1. **`requireAuth` (`middleware/auth.js`)**:
   - Validates that `req.session.user` exists.
   - If missing, unauthenticated requests to web routes are redirected to `/auth/login?redirect=...`.
   - API requests receive HTTP 401 Unauthorized JSON payloads.
2. **`requireRole(roles)` (`middleware/role.js`)**:
   - Verifies that `req.session.user.role` matches the required role.
   - Unauthorized attempts receive HTTP 403 Forbidden and render `views/errors/403.ejs`.
3. **Resource-Level Ownership Verification**:
   - In `appointmentController.js`, appointment operations (accept, reject, complete, view) verify that the logged-in user is either:
     a) The assigned doctor (`appointment.doctorId.toString() === currentUserId`)
     b) The owning patient (`appointment.patientId.toString() === currentUserId`)
     c) A clinic administrator (`role === 'admin'`)

---

## 4. Network & Application Layer Protection

### 4.1 Rate Limiting (`middleware/rateLimiter.js`)
- Protects `/auth/login` and `/auth/register` using `express-rate-limit`.
- Configuration:
  - Window: 15 minutes
  - Max Requests: 60 attempts per IP address
  - Rejection: HTTP 429 Too Many Requests with descriptive warning.

### 4.2 HTTP Security Headers (`helmet`)
- Injected in `app.js` using `helmet()`.
- Headers added:
  - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
  - `Strict-Transport-Security` (forces HTTPS connections)
  - `X-Download-Options: noopen`
  - `X-XSS-Protection: 0`

---

## 5. Input Validation & Data Sanitization

- Validation logic is centralized in `middleware/validation.js`:
  - `validateRegister`: Validates name length, email RFC-5322 regex, password minimum length (6), and role-specific requirements.
  - `validateLogin`: Validates presence of email and password.
  - `validateAppointment`: Enforces valid MongoDB `ObjectId` for doctors, ISO date format (`YYYY-MM-DD`), 24-hour time format (`HH:MM`), and 500-character cap on medical notes.
- Mongoose schema constraints enforce string trimming, minimums, maximums, and enums at the database driver layer.

---

## 6. Environment Variables & Secret Handling

- Sensitive configuration keys are managed exclusively via environment variables:
  - `MONGODB_URI`: Database connection URI (never committed to Git).
  - `SESSION_SECRET`: Cryptographic key used to sign session cookies.
  - `NODE_ENV`: Controls production optimizations, debug logging, and cookie `secure` flags.
- `.gitignore` strictly excludes `.env`, `node_modules/`, `data/`, and log files.

---

## 7. Known Production Considerations & Next Steps

If upgrading from hackathon grade to enterprise healthcare compliance (HIPAA / GDPR):
1. **Persistent Session Storage**: Replace the in-memory session store with `connect-mongo` or Redis.
2. **CSRF Tokens**: Implement `csurf` or double-submit cookie tokens for all state-modifying POST requests.
3. **Audit Logging**: Implement immutable database-backed audit logs for every PHI (Protected Health Information) view and modification.
4. **Field-Level Encryption**: Encrypt the `notes` field in the database at rest using MongoDB Client-Side Field Level Encryption (CSFLE).
