# MediPulse Clinic

> A modern outpatient appointment scheduling and real-time waiting queue management platform designed for healthcare clinics.

MediPulse Clinic is a lightweight clinic workflow and queue-management platform for small clinics that helps patients book appointments, check in, and receive live queue updates while helping clinic staff manage patient flow.

---

## 1. System Architecture

The repository is organized into two self-contained application services:

```text
clinic-appointment-management-system/
├── frontend/             # Next.js 15 App Router, React 19, TypeScript, SSR, Dark UI
└── backend/              # Node.js, Express, TypeScript, Socket.IO, Mongoose, Jest
```

### Frontend Architecture
- **Framework**: Next.js 15 with React 19 & TypeScript
- **Routing**: Next.js App Router (`src/app/`)
- **Rendering Model**:
  - Server-Side Rendering (SSR) for public landing pages, doctor directory, and doctor profiles.
  - Client Components (`'use client'`) for interactive booking forms, live Socket.IO queue trackers, and staff consoles.
- **Design System**: Professional dark charcoal theme (`#090a0f`, `#11131a`, `#181b24`), responsive layout, accessible inputs, focus outlines, and status badges.
- **Iconography**: Maintained Lucide React icon library. Zero emojis across all views.

### Backend Architecture
- **Runtime**: Node.js & Express with TypeScript
- **Database**: MongoDB Atlas with Mongoose ODM
- **Real-Time Layer**: Socket.IO authenticated WebSocket server with role-based rooms (`user:<id>`, `doctor:<id>`, `clinic:<id>`)
- **Authentication**: JWT authentication delivered via HttpOnly cookies and Bearer authorization headers
- **Authorization**: Role-Based Access Control (RBAC) middleware verifying permissions per route
- **Double-Booking Engine**: Atomic compound unique database indexes (`{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`) with partial filter expressions
- **Quality Assurance**: Jest and Supertest integration test suite covering authentication, RBAC, double-booking concurrency, and queue operations

---

## 2. Core Feature: Smart Clinic Queue & Waiting-Time Management

MediPulse Clinic eliminates waiting-room uncertainty through digital check-in and dynamic queue pacing:

### Patient Capabilities
- Book confirmed appointment slots with verified physicians.
- Self check-in digitally on the day of their appointment.
- Receive a sequential clinic queue token (e.g., `#3`).
- View the number of patients ahead and dynamic waiting-time estimates.
- Receive live queue position updates and physician delay notices via Socket.IO without manual page refreshes.
- Clear clinical disclaimer that waiting times are mathematical approximations.

### Doctor Capabilities
- View today's queue list and current in-room patient.
- Single-click action to call the next patient (`WAITING` -> `CALLED`).
- Record consultation start (`CALLED` -> `IN_CONSULTATION`) and completion (`COMPLETED`).
- Mark absent patients as no-show (`NO_SHOW`).
- Pause or resume the queue.
- Broadcast clinical delay notices (e.g., +15 mins due to an emergency case) directly to waiting patients.

### Receptionist Capabilities
- Daily intake overview across all clinic practitioners.
- Fast-track desk check-in for scheduled arrivals.
- Walk-in intake registration with automatic slot generation and token assignment.

### Administrator Capabilities
- Manage clinic staff roles and account privileges.
- Configure doctor specialties, room numbers, and weekly working schedules.
- Review system audit logs for security, scheduling, and queue transitions.

---

## 3. Appointment Lifecycle

The backend strictly enforces the following state transitions:

```text
[PENDING] ────► [CONFIRMED] ────► [CHECKED_IN] ────► [IN_PROGRESS] ────► [COMPLETED]
    │                │                  │
    ▼                ▼                  ▼
[REJECTED]      [CANCELLED]         [NO_SHOW]
```

- `PENDING`: Initial patient booking awaiting physician review.
- `CONFIRMED`: Physician or staff approved the appointment.
- `CHECKED_IN`: Patient arrived at the clinic; sequential queue number issued.
- `IN_PROGRESS`: Patient entered consultation room.
- `COMPLETED`: Visit concluded.
- `CANCELLED`: Patient or staff cancelled prior to check-in.
- `REJECTED`: Physician declined booking request with reason.
- `NO_SHOW`: Patient failed to appear when called.

---

## 4. Double-Booking Prevention

Double-booking protection is enforced at the database level using a MongoDB unique compound index:

```typescript
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $nin: ['CANCELLED', 'REJECTED'] }
    }
  }
);
```

- When two requests attempt to book the exact same doctor, date, and time simultaneously, MongoDB guarantees that exactly one transaction succeeds (HTTP 201) while the competing request receives a 409 Conflict with a clear message.
- Validated via automated concurrency tests executing simultaneous HTTP requests.

---

## 5. Local Setup Instructions

### Prerequisites
- Node.js 18+ LTS
- MongoDB Atlas cluster URI

### 1. Clone Repository
```bash
git clone https://github.com/Divyanshgupta2580/Clinic-Appointment-Management-System.git
cd Clinic-Appointment-Management-System
```

### 2. Configure Backend
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/clinic_appointment_db
SESSION_SECRET=your_super_secret_64_char_key_here
FRONTEND_URL=http://localhost:3000
```
Start backend:
```bash
# Development mode with hot-reload
npm run dev

# Production build and run
npm run build
npm start
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```
Start frontend:
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm start
```

The application is now accessible at `http://localhost:3000`.

---

## 6. Running Automated Tests

Run the backend integration test suite:

```bash
cd backend
npm test
```

Test coverage includes:
- Role registration & authentication (Doctor, Patient, Receptionist, Admin)
- Role-based route authorization guards
- Atomic concurrent double-booking race condition verification
- Smart Queue check-in, position calculation, and consultation state transitions
- Health status endpoint

---

## 7. Render Deployment Guide

Deploy MediPulse Clinic as two separate Web Services on Render:

### Service 1: Backend Web Service
1. **Name**: `medipulse-backend`
2. **Root Directory**: `backend`
3. **Environment**: `Node`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<MongoDB Atlas Connection String>`
   - `SESSION_SECRET`: `<64-character random string>`
   - `FRONTEND_URL`: `https://<your-frontend-service>.onrender.com`

### Service 2: Frontend Web Service
1. **Name**: `medipulse-frontend`
2. **Root Directory**: `frontend`
3. **Environment**: `Node`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-service>.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<your-backend-service>.onrender.com`

---

## 8. License

Distributed under the MIT License. See `LICENSE` for more information.
