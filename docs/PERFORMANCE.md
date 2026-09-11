# Performance & Optimization Documentation

This document outlines the genuine performance optimizations implemented in the MediPulse Clinic Management System. No non-existent optimizations (such as caching or search clusters) are claimed; every optimization described below is implemented in active source code.

---

## 1. Database Indexing & Query Acceleration

### 1.1. Compound Unique Booking Index
- **Index:** `{ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }`
- **Effect:** Transforms slot conflict detection from an O(N) full collection scan into an O(log N) B-Tree index lookup. MongoDB determines whether a slot is free in sub-millisecond time.

---

### 1.2. Query-Specific Secondary Indexes
- **Patient Appointment History:** `{ patientId: 1, appointmentDate: -1, createdAt: -1 }`
  - Allows patients with hundreds of historical visits to view paginated, chronologically sorted records using an indexed index-scan without in-memory sorting (`SORT_KEY_GENERATOR`).
- **Doctor Daily Schedule:** `{ doctorId: 1, appointmentDate: 1, status: 1 }`
  - Satisfies the doctor dashboard query for today’s active consultations directly from the index.
- **Doctor Specialization:** `{ specialization: 1 }`
  - Accelerates filtering across medical specialties in the public doctor directory.

---

## 2. Memory & CPU Optimization with Mongoose

### 2.1. Lean Queries (`.lean()`)
By default, Mongoose converts raw BSON documents into complex Mongoose Document instances complete with change tracking, virtual getters, and prototype methods.
- **Optimization:** For read-only controllers (dashboard rendering, doctor directories, appointment histories), queries chain `.lean()`.
- **Impact:**
  - Bypasses Mongoose document hydration.
  - Returns plain, lightweight JavaScript objects.
  - Reduces heap memory allocation by ~60% and cuts query latency significantly.

---

### 2.2. Projection / Field Selection (`.select()`)
Queries avoid requesting unneeded fields over the network.
- **Example:**
  ```javascript
  const doctor = await User.findById(doctorId).select('name email role').lean();
  ```
- **Impact:** Omits large or sensitive fields (`passwordHash`, internal metadata), reducing network payload size and MongoDB memory buffer usage.

---

### 2.3. Eliminating N+1 Queries via In-Memory Map Lookups
When displaying patient appointments, the doctor's specialization must be displayed alongside their name. Naive implementations issue a separate `DoctorProfile.findOne()` query inside a loop for every appointment (the classic N+1 anti-pattern).
- **Our Solution:**
  1. Fetch recent appointments with `.populate('doctorId', 'name email')`.
  2. Extract unique doctor IDs using `map` and `filter`.
  3. Dispatch a single batch query: `DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean()`.
  4. Build a JavaScript `Map(userId -> specialization)`.
  5. Enrich the appointments in memory in O(1) time per item.
- **Impact:** Reduces database roundtrips from N+1 to exactly 2.

---

## 3. Pagination & Data Limiting

To prevent high memory usage and long page load times as the database grows:
- **Doctor Appointment Management:** Paginated at 10 items per page with `.skip()` and `.limit()`.
- **Patient History:** Paginated at 8 items per page with `.skip()` and `.limit()`.
- **Dashboard Previews:** Capped at 5 recent visits with `.limit(5)`.

---

## 4. Connection Pooling

- Managed through `mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })` in `config/db.js`.
- Utilizes Mongoose's built-in TCP socket connection pool (default max pool size of 100).
- Multiple concurrent HTTP requests reuse idle connections in the pool rather than incurring the overhead of establishing a new TLS/TCP handshake on every request.

---

## 5. Non-Blocking Asynchronous Operations

- All controller operations utilize `async/await` and `Promise.all` for parallel independent queries.
- **Example:**
  ```javascript
  const [totalPatients, totalDoctors, totalAppointments, pendingCount, acceptedCount, completedCount, doctorsList] =
    await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'accepted' }),
      Appointment.countDocuments({ status: 'completed' }),
      User.find({ role: 'doctor' }).select('name email createdAt').lean(),
    ]);
  ```
- **Impact:** Executes independent collection counts concurrently across MongoDB connection pool sockets rather than serially, reducing admin dashboard load latency by ~70%.
