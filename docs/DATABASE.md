# Database Architecture & Schema Documentation

## 1. Database Overview

The MediPulse Clinic database is powered by **MongoDB** (compatible with MongoDB Atlas and local instances) and modeled using **Mongoose ODM v8.10.1**.

### Entity Relationship Diagram (ERD)

```
       ┌────────────────────────┐
       │         User           │
       ├────────────────────────┤
       │ _id: ObjectId          │◄──────────┐
       │ name: String           │           │
       │ email: String (unique) │           │
       │ passwordHash: String   │           │
       │ role: Enum             │           │
       │ timestamps: true       │           │
       └──────────┬─────────────┘           │
                  │                         │
                  │ 1:1 (when doctor)       │ 1:N (as doctor)
                  ▼                         │
       ┌────────────────────────┐           │
       │     DoctorProfile      │           │
       ├────────────────────────┤           │
       │ _id: ObjectId          │           │
       │ userId: ObjectId (ref) │           │
       │ specialization: String │           │
       │ qualification: String  │           │
       │ experience: Number     │           │
       │ consultationDuration   │           │
       │ availableDays: [String]│           │
       │ availableStartTime     │           │
       │ availableEndTime       │           │
       └────────────────────────┘           │
                  ▲                         │
                  │                         │
                  │ 1:N (as patient)        │
                  │                         │
       ┌──────────┴─────────────┐           │
       │      Appointment       │           │
       ├────────────────────────┤           │
       │ _id: ObjectId          │           │
       │ patientId: ObjectId(ref)───────────┤
       │ doctorId: ObjectId(ref)────────────┘
       │ appointmentDate: String│
       │ appointmentTime: String│
       │ status: Enum           │
       │ notes: String          │
       │ timestamps: true       │
       └────────────────────────┘
```

---

## 2. Models Specification

### 2.1 User Model (`models/User.js`)
Collection Name: `users`

| Field | Type | Required | Unique | Default | Validation / Constraints |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `name` | `String` | Yes | No | — | Trimmed, minlength: 2, maxlength: 100 |
| `email` | `String` | Yes | **Yes** | — | Trimmed, lowercase, email format regex |
| `passwordHash` | `String` | Yes | No | — | Salted bcrypt hash |
| `role` | `String` | Yes | No | `'patient'` | Enum: `['patient', 'doctor', 'admin']` |
| `createdAt` | `Date` | Auto | No | Auto | Mongoose timestamp |
| `updatedAt` | `Date` | Auto | No | Auto | Mongoose timestamp |

#### Instance Methods:
- `comparePassword(candidatePassword)`: Uses `bcrypt.compare` to verify login credentials.

#### Static Methods:
- `hashPassword(plainPassword)`: Generates salt factor 10 and hashes plaintext password.

---

### 2.2 Doctor Profile Model (`models/DoctorProfile.js`)
Collection Name: `doctorprofiles`

| Field | Type | Required | Unique | Default | Validation / Constraints |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `userId` | `ObjectId` | Yes | **Yes** | — | References `User` model |
| `specialization`| `String` | Yes | No | — | Trimmed, maxlength: 100 |
| `qualification` | `String` | Yes | No | — | Trimmed, maxlength: 100 (e.g. MBBS, MD) |
| `experience` | `Number` | Yes | No | — | Min: 0 (Years of practice) |
| `consultationDuration`| `Number` | No | No | `30` | Min: 10, Max: 120 (Minutes per slot) |
| `availableDays` | `[String]` | No | No | Mon–Fri | Validator: Subsets of `['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']` |
| `availableStartTime`| `String` | No | No | `'09:00'` | 24-hour HH:MM regex format |
| `availableEndTime` | `String` | No | No | `'17:00'` | 24-hour HH:MM regex format |

---

### 2.3 Appointment Model (`models/Appointment.js`)
Collection Name: `appointments`

| Field | Type | Required | Unique | Default | Validation / Constraints |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `patientId` | `ObjectId` | Yes | No | — | References `User` model |
| `doctorId` | `ObjectId` | Yes | No | — | References `User` model |
| `appointmentDate`| `String` | Yes | No | — | Format `YYYY-MM-DD` (Timezone resilient) |
| `appointmentTime`| `String` | Yes | No | — | Format `HH:MM` (24-hour clock) |
| `status` | `String` | Yes | No | `'pending'` | Enum: `['pending', 'accepted', 'rejected', 'completed', 'cancelled']` |
| `notes` | `String` | No | No | `''` | Maxlength: 500 characters |

---

## 3. Index Architecture

### 3.1 Compound Unique Index on Appointments (Double-Booking Prevention)

```javascript
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    name: 'unique_doctor_slot_active',
    partialFilterExpression: {
      status: { $in: ['pending', 'accepted', 'completed'] },
    },
  }
);
```

#### Why Partial Filter Expressions?
1. **Medical Record Retention**: When a doctor declines (`rejected`) or a patient calls off (`cancelled`) an appointment, the record is retained in the database for compliance and audit logs.
2. **Instant Slot Reclamation**: The partial filter expression limits index enforcement strictly to active statuses (`pending`, `accepted`, `completed`). As soon as an appointment status transitions to `rejected` or `cancelled`, the unique lock on that slot is lifted automatically. Another patient can immediately book that same date and time.
3. **Database Level Race-Condition Safety**: Even if two patients attempt to book the exact same slot within 2 milliseconds, MongoDB's WiredTiger engine permits only the first write and throws `E11000 duplicate key error` on the second.

### 3.2 Query Optimization Indexes

1. **`User.email`**:
   - `{ email: 1 }` (Unique)
   - Used for instant O(1) user lookups during authentication.
2. **`DoctorProfile.specialization`**:
   - `{ specialization: 1 }`
   - Speeds up directory searches when patients filter by medical specialty.
3. **`Appointment (patient history)`**:
   - `{ patientId: 1, appointmentDate: -1, createdAt: -1 }`
   - Optimizes paginated patient dashboard queries sorted by most recent date.
4. **`Appointment (doctor appointments)`**:
   - `{ doctorId: 1, appointmentDate: 1, status: 1 }`
   - Powers doctor schedule views and daily consultation lists.

---

## 4. Date & Time String Invariants

### Why String Representations (`YYYY-MM-DD` and `HH:MM`)?
1. **Timezone Shifts**: JavaScript `Date` objects internally serialize to UTC timestamps. Storing `2026-10-15T09:00:00.000Z` can cause dates to shift across midnight in different timezones (e.g. UTC vs IST +05:30 vs EST -05:00).
2. **Predictable Querying**: String equality `{ appointmentDate: '2026-10-15', appointmentTime: '09:00' }` is exact, human-readable, and does not require range comparisons (`$gte`, `$lt`) across time offsets.
3. **Day-of-Week Consistency**: `slotUtils.js` parses dates using `Date.UTC(year, month - 1, day)` ensuring day-of-week matching is 100% deterministic regardless of host machine timezone.
