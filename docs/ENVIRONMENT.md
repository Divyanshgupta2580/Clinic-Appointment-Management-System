# Environment Variables Specification

This document details all configuration parameters utilized by the **Clinic Appointment Management System** across local development, Render (Primary), and Vercel environments.

---

## 1. Environment Variables Reference Table

| Variable Name | Required | Local Default Value | Production Source | Security Considerations | Purpose |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `PORT` | **Yes** | `3000` | Injected dynamically by host (e.g. Render assigns random port) | Non-sensitive. Never hard-code; fallback to `3000` only in development. | Defines the network port on which the Express HTTP server listens. |
| `NODE_ENV` | **Yes** | `development` | Set explicitly in cloud dashboard (`production`) | Controls cookie `secure` flag, stack trace suppression, and proxy trust. | Informs Express, Helmet, and Session middleware of the deployment runtime mode. |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster.mongodb.net/clinic_appointment_db` | Cloud dashboard environment variable (Atlas connection string) | **CRITICAL SECRET.** Contains DB credentials. Never commit to git or log to console. | Provides the connection URI for MongoDB Atlas with replica set and SSL parameters. |
| `SESSION_SECRET` | **Yes** | Strong local random string | Generated high-entropy secret (e.g., `openssl rand -hex 32`) | **CRITICAL SECRET.** Used to cryptographically sign session cookie IDs (`medipulse.sid`). | Prevents session ID tampering and unauthorized session forgery. |
| `APP_URL` | **Yes** | `http://localhost:3000` | Injected public domain (e.g., `https://medipulse-clinic.onrender.com`) | Non-sensitive. Must reflect the canonical public URL with HTTPS in production. | Used for canonical redirects, absolute email/notification links, and metadata. |
| `TRUST_PROXY` | **Optional** | Empty (defaults to `1` when `NODE_ENV=production`) | Set to `1` on Render, Vercel, Railway, or AWS reverse proxies | Instructs Express to trust `X-Forwarded-*` headers from the host proxy. | Enables secure cookie transmission (`cookie.secure: true`) over SSL termination proxies. |

---

## 2. Local Configuration (`.env`)

A local `.env` file should be placed in the project root directory. It is strictly excluded from version control via `.gitignore`.

```ini
# Environment
NODE_ENV=development

# Server Port (Local Default)
PORT=3000

# MongoDB Atlas Connection URI
# Replace with your actual Atlas cluster credentials:
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db

# Session Secret (High-entropy secret key)
SESSION_SECRET=a_secure_local_dev_secret_key_medipulse_2026

# Canonical Application URL
APP_URL=http://localhost:3000

# Reverse Proxy (Optional, leave empty for local development)
TRUST_PROXY=
```

---

## 3. Production Configuration Best Practices

### 3.1. Secret Generation
To generate a cryptographically strong session secret for production, run in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.2. Verification & Safety Rules
1. **Never Commit `.env`:** The repository `.gitignore` blocks `.env` and `.env.*` while keeping `.env.example`.
2. **Zero Hardcoding:** No fallback in source code substitutes for a production `MONGODB_URI` or `SESSION_SECRET`.
   - If `MONGODB_URI` is absent, `config/db.js` throws an immediate explicit fatal error: `MONGODB_URI is not defined in environment variables.`
   - If `SESSION_SECRET` is absent, `app.js` throws an immediate explicit fatal error: `SESSION_SECRET is not defined in environment variables.`
3. **Zero Secret Logging:** Neither `server.js` nor `config/db.js` logs connection strings or passwords. Successful database connections log only the active database name (`clinic_appointment_db`).
