# Comprehensive Deployment Guide: Render & Vercel

This guide provides end-to-end instructions for deploying the **Clinic Appointment Management System (MediPulse)** to **Render** (Primary Target) and **Vercel** (Serverless Deployment), along with local development setup, MongoDB Atlas configuration, and architectural comparison.

---

## 1. Architectural Overview & Platform Decision

| Dimension | Render (Recommended Primary) | Vercel (Serverless-Oriented) |
| :--- | :--- | :--- |
| **Execution Model** | Persistent, long-lived Node.js container process | Ephemeral Serverless Functions (AWS Lambda-based) |
| **Lifecycle** | Server boots once; handles continuous requests | Container spins up on-demand; terminates after request |
| **Fit for EJS SSR** | **100% Native.** EJS renders smoothly with templates in filesystem. | **Supported.** Routes to serverless adapter via `vercel.json`. |
| **Session Memory** | **Stable.** In-memory sessions persist across requests in single instance. | **Limited.** Memory is isolated per lambda; causes session drops unless external DB store is added. |
| **Port Binding** | Reads `process.env.PORT` dynamically and binds to `0.0.0.0`. | Ignored; platform automatically routes HTTP via serverless invocation. |
| **Recommendation** | **PRIMARY RECOMMENDATION.** Ideal for college viva, demo, and production single-instance hosting. | **Secondary.** Good for edge/serverless experimentation; session persistence requires external store. |

---

## 2. MongoDB Atlas Setup (Prerequisite)

Before deploying to either cloud provider, configure your MongoDB Atlas cluster:

### Step 1: Create Database User
1. Navigate to **MongoDB Atlas** -> **Security** -> **Database Access**.
2. Click **Add New Database User**.
3. Select **Password Authentication**. Provide a username (e.g., `clinic_admin`) and a strong password.
4. Set Database User Privileges to **Read and write to any database**.
5. Save the user.

### Step 2: Configure Network Access (IP Whitelist)
Because cloud platforms like Render and Vercel use dynamic outbound IP addresses, you must allow connections from anywhere:
1. Navigate to **Security** -> **Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere** (`0.0.0.0/0`).
4. Click **Confirm**. (Without this step, your deployment will fail with `querySrv ECONNREFUSED` or timeout).

### Step 3: Obtain Connection String
1. In **Deployments** -> **Database**, click **Connect**.
2. Choose **Drivers** (Node.js).
3. Copy the SRV URI:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/clinic_appointment_db?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password and ensure the database name is `clinic_appointment_db`.

---

## 3. Local Development Setup

Follow these steps to run the application on your development machine:

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/Clinic-Appointment-Management-System.git
cd Clinic-Appointment-Management-System

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env

# 4. Edit .env with your Atlas URI and session secret
# NODE_ENV=development
# PORT=3000
# MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/clinic_appointment_db
# SESSION_SECRET=your_super_secret_session_key

# 5. Start development server with automatic file watching
npm run dev
# OR start standard production server
npm start

# 6. Open in browser
# Visit http://localhost:3000
```

---

## 4. Deploying to Render (Primary Recommendation)

Render provides a standard Node.js runtime environment that naturally matches our Express + EJS Server-Side Rendered architecture.

### Step-by-Step Render Deployment:

1. **Push Code to GitHub:**
   Ensure your latest code is pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: deployment ready for Render"
   git push origin main
   ```

2. **Create New Web Service:**
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub account and select the `Clinic-Appointment-Management-System` repository.

3. **Configure Service Settings:**
   - **Name:** `medipulse-clinic` (or your chosen service name)
   - **Region:** Choose the region closest to your MongoDB Atlas cluster (e.g., Singapore, Frankfurt, Oregon)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

4. **Set Environment Variables:**
   Under the **Environment Variables** section, add:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db` |
   | `SESSION_SECRET` | *(Paste a long random 64-character hex string)* |

   > [!IMPORTANT]
   > **DO NOT** add `PORT` in the Render Environment Variables tab! Render automatically assigns a dynamic port and sets `process.env.PORT`. The application reads this value automatically and binds to `0.0.0.0:${PORT}`.

5. **Deploy & Verify:**
   - Click **Create Web Service**.
   - Wait for the build logs to finish:
     ```text
     ==> Running build command 'npm install'...
     ==> Starting service with 'npm start'...
     [MongoDB] Connected successfully to database: clinic_appointment_db
     🏥 MediPulse Clinic Management System
     🚀 Server running on port: 10000
     🌐 Host: 0.0.0.0 (Accepts external connections)
     ⚙️  Environment: production
     ```
   - Click your service URL: `https://<service-name>.onrender.com`.
   - Verify health check: `https://<service-name>.onrender.com/health` (should return `{"status":"ok", ...}`).

---

## 5. Deploying to Vercel (Serverless Adaptation)

Vercel treats web applications as serverless functions. The repository includes `api/index.js` and `vercel.json` to bridge incoming HTTP requests into Express.

### Step-by-Step Vercel Deployment:

1. **Import Project into Vercel:**
   - Log in to the [Vercel Dashboard](https://vercel.com/).
   - Click **Add New...** -> **Project**.
   - Select your GitHub repository.

2. **Configure Build Settings:**
   - **Framework Preset:** `Other`
   - **Root Directory:** `./`
   - Build and Output settings can be left at default.

3. **Configure Environment Variables:**
   Add the following environment variables in Vercel project settings:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db` |
   | `SESSION_SECRET` | *(Paste a long random 64-character hex string)* |

4. **Deploy:**
   - Click **Deploy**.
   - Vercel routes incoming requests through `vercel.json` to `/api/index.js`.
   - Verify health check: `https://<project-name>.vercel.app/health`.

### ⚠️ Honest Vercel Limitation Notice (Sessions):
- **Serverless Session Memory Isolation:** Vercel spins up independent, ephemeral AWS Lambda containers to service incoming HTTP requests. Because `express-session` uses an in-memory session store by default, memory is **not shared across separate lambdas**.
- **Impact:** A patient who logs in on Lambda A may be routed to Lambda B on their next request (e.g. `/patient/dashboard`), causing a session loss / redirect to login.
- **Why Render is Preferred:** For an Express + EJS application using session-cookie authentication without Redis, **Render is the primary and recommended deployment target**.

---

## 6. Health Check Monitoring

The application exposes an unauthenticated, zero-overhead health check endpoint:

```http
GET /health
```

### Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-11T10:07:19.233Z"
}
```

### Purpose:
- Used by Render health probes to confirm the service is live before routing external traffic.
- Used by third-party uptime monitoring tools (e.g., BetterStack, UptimeRobot).
- Exposes **no** internal credentials, database strings, or stack traces.

---

## 7. Troubleshooting Common Deployment Issues

### 1. `querySrv ECONNREFUSED` or Mongoose Timeout
- **Cause:** MongoDB Atlas Network Access whitelist does not allow the cloud provider's IP.
- **Solution:** In MongoDB Atlas -> Network Access, verify that `0.0.0.0/0` is added to the IP Access List.

### 2. Session Cookies Not Saved / Immediate Logout in Production
- **Cause:** `cookie.secure: true` requires HTTPS and a trusted reverse proxy.
- **Solution:** Verify that `NODE_ENV=production` is set and that `app.set('trust proxy', 1)` is enabled in `app.js` (which is already configured).

### 3. Application Exits with "MONGODB_URI is not defined"
- **Cause:** Missing environment variable in cloud dashboard.
- **Solution:** Check the cloud provider dashboard (Render or Vercel) and ensure `MONGODB_URI` is spelled identically in capital letters.

### 4. Port Conflicts Locally
- **Cause:** Another process is using port 3000.
- **Solution:** Run `PORT=4000 npm start` or define `PORT=4000` in `.env`.
