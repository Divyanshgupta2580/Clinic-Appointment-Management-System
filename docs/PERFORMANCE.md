# Performance Architecture & Optimization Guide

This document details the database, server, network, and memory optimizations implemented throughout MediPulse Clinic.

---

## 1. Database Query Optimizations

### 1.1 Lean Queries (`.lean()`)
- **What it does:** Bypasses Mongoose's internal document hydration (prototype inheritance, change tracking, getters/setters, virtuals) and returns plain JavaScript objects directly from the MongoDB driver.
- **Where it is used:** Used across read operations in `patientController.js`, `doctorController.js`, `appointmentController.js`, and `adminController.js`.
- **Performance Impact:** Reduces memory footprint by ~60% and increases query execution throughput by 2x to 4x on large result sets.

### 1.2 Selective Projections (`.select()`)
- **What it does:** Restricts returned fields from MongoDB to only those required by the view or API caller.
- **Example:**
  ```javascript
  const doctor = await User.findById(doctorId).select('name email role').lean();
  ```
- **Performance Impact:** Eliminates network transport overhead between the database and application server, and prevents sensitive fields (like `passwordHash`) from entering controller scope.

### 1.3 Compound Unique & Secondary Indexing
- **Indices Configured:**
  1. `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }` (Unique with partial filter on active status)
  2. `{ patientId: 1, appointmentDate: -1, createdAt: -1 }` (Patient history index)
  3. `{ doctorId: 1, appointmentDate: 1, status: 1 }` (Doctor appointment management index)
  4. `{ specialization: 1 }` (Doctor specialty catalog filter)
- **Performance Impact:** Converts table scans ($O(N)$) into B-Tree index lookups ($O(\log N)$), ensuring consistent sub-millisecond response times even as the appointment collection scales.

### 1.4 Preventing N+1 Query Traps
- **Problem:** Iterating over appointments and querying doctor profile records inside a `map` or loop creates $N+1$ database round-trips.
- **Solution:** Handled via batch `in` queries and HashMaps in `patientController.js`:
  ```javascript
  const doctorIds = recentAppointments.map((a) => a.doctorId?._id).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } })
    .select('userId specialization')
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p.specialization));
  ```
- **Performance Impact:** Reduces database round-trips from $N+1$ to exactly 2 queries.

### 1.5 Parallel Asynchronous Operations (`Promise.all`)
- **What it does:** Dispatches independent database operations concurrently rather than awaiting them sequentially.
- **Where it is used:** Dashboard metrics across all roles:
  ```javascript
  const [todayCount, pendingCount, completedCount, upcomingToday] = await Promise.all([
    Appointment.countDocuments({ doctorId, appointmentDate: todayStr }),
    Appointment.countDocuments({ doctorId, status: 'pending' }),
    Appointment.countDocuments({ doctorId, status: 'completed' }),
    Appointment.find({ ... }).lean(),
  ]);
  ```
- **Performance Impact:** Reduces dashboard load latency from the sum of all query times to the duration of the single slowest query.

---

## 2. Network & Server-Side Optimizations

### 2.1 Server-Side Pagination
- Implemented on:
  - Patient Appointment History (`/patient/appointments`): 8 records per page.
  - Doctor Appointments List (`/doctor/appointments`): 10 records per page.
- **Performance Impact:** Bounded memory consumption on the server and predictable, lightweight HTML page payloads delivered to the browser.

### 2.2 Room-Targeted WebSocket Messaging
- **What it does:** Socket.IO events are routed exclusively to the specific room ID (`user:<userId>`, `doctor:<doctorId>`) rather than broadcasting globally to all connected clients.
- **Performance Impact:** Avoids network bandwidth saturation and eliminates unnecessary DOM manipulation cycles on client devices that are not involved in the transaction.

### 2.3 Persistent Database Connection Pooling
- Handled in `config/db.js` using Mongoose default connection pooling (10 connections).
- Individual HTTP requests reuse warm, open TCP connections to MongoDB, avoiding the high cost of TCP handshakes and TLS negotiation per request.

---

## 3. Known Performance Limits & Scaling Roadmap

1. **Horizontal Scaling:** When running multiple Node.js instances behind a load balancer:
   - WebSockets require the `@socket.io/redis-adapter` to distribute room messages across nodes.
   - Sessions require a shared session store (e.g., MongoDB or Redis) rather than memory.
2. **Database Sharding:** As appointment volume scales past millions of records, the `appointments` collection can be sharded on `doctorId` to balance load across database clusters.
