# Database Design & Schema Documentation

This document describes the database design, schema definitions, relationships, indexes, and concurrency constraints in the MediPulse Clinic Management System.

---

## 1. Entity-Relationship (ER) Diagram

```
+-------------------------------------------------------------+
|                           User                              |
+-------------------------------------------------------------+
| _id: ObjectId (PK)                                          |
| name: String                                                |
| email: String (Unique)                                      |
| passwordHash: String                                        |
| role: Enum ['patient', 'doctor', 'admin']                   |
| createdAt: Date                                             |
| updatedAt: Date                                             |
+-------------------------------------------------------------+
        │ 1                                           │ 1
        │ (if role == 'doctor')                       │
        │ 1:1                                         │ 1:N (as doctor)
        ▼                                             ▼
+-----------------------------+               +---------------------------------------------+
|        DoctorProfile        |               |                 Appointment                 |
+-----------------------------+               +---------------------------------------------+
| _id: ObjectId (PK)          |               | _id: ObjectId (PK)                          |
| userId: ObjectId (FK -> User|               | patientId: ObjectId (FK -> User)            |
|   Unique)                   |               | doctorId: ObjectId (FK -> User)             |
| specialization: String      |               | appointmentDate: String (YYYY-MM-DD)        |
| qualification: String       |               | appointmentTime: String (HH:MM)             |
| experience: Number          |               | status: Enum                                |
| consultationDuration: Number|               |   ['pending', 'accepted', 'rejected',       |
| availableDays: [String]     |               |    'completed', 'cancelled']                |
| availableStartTime: String  |               | notes: String                               |
| availableEndTime: String    |               | createdAt: Date                             |
| createdAt: Date             |               | updatedAt: Date                             |
| updatedAt: Date             |               +---------------------------------------------+
+-----------------------------+                               ▲
                                                              │ 1:N (as patient)
                                                              │
                                                        +-----+-----+
                                                        |   User    |
                                                        +-----------+
```

---

## 2. Schema Specifications

### 2.1. `User` Schema
- **Collection Name:** `users`
- **Model File:** [models/User.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/User.js)

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes (Auto) | Primary Key | Unique document identifier |
| `name` | `String` | Yes | Min: 2, Max: 100, Trim | Full name of patient, doctor, or administrator |
| `email` | `String` | Yes | Unique, Lowercase, Trim, Email Regex | Unique login email address |
| `passwordHash` | `String` | Yes | Bcrypt Hash | Salted hash (10 rounds); never stores plain text |
| `role` | `String` | Yes | Enum: `['patient', 'doctor', 'admin']`, Default: `'patient'` | Access control role |
| `createdAt` | `Date` | Yes (Auto) | Timestamp | Account creation timestamp |
| `updatedAt` | `Date` | Yes (Auto) | Timestamp | Last profile update timestamp |

---

### 2.2. `DoctorProfile` Schema
- **Collection Name:** `doctorprofiles`
- **Model File:** [models/DoctorProfile.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/DoctorProfile.js)

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes (Auto) | Primary Key | Unique document identifier |
| `userId` | `ObjectId` | Yes | Ref: `User`, Unique | Foreign key linking 1-to-1 to a doctor User |
| `specialization` | `String` | Yes | Max: 100, Trim | Medical specialty (e.g. Cardiology, Pediatrics) |
| `qualification` | `String` | Yes | Max: 100, Trim | Professional degrees (e.g. MBBS, MD) |
| `experience` | `Number` | Yes | Min: 0 | Years in medical practice |
| `consultationDuration`| `Number` | Yes | Default: 30, Min: 10, Max: 120 | Length of each consultation slot in minutes |
| `availableDays` | `[String]` | Yes | Default: Mon-Fri, Valid weekdays | Days of the week the doctor conducts visits |
| `availableStartTime`| `String` | Yes | Default: `'09:00'`, Regex `HH:MM` | Daily clinic start time |
| `availableEndTime` | `String` | Yes | Default: `'17:00'`, Regex `HH:MM` | Daily clinic end time |
| `createdAt` | `Date` | Yes (Auto) | Timestamp | Profile creation timestamp |
| `updatedAt` | `Date` | Yes (Auto) | Timestamp | Last update timestamp |

---

### 2.3. `Appointment` Schema
- **Collection Name:** `appointments`
- **Model File:** [models/Appointment.js](file:///Users/apple/Desktop/Clinic-Appointment-Management-System/models/Appointment.js)

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes (Auto) | Primary Key | Unique appointment identifier |
| `patientId` | `ObjectId` | Yes | Ref: `User`, Indexed | Reference to patient User |
| `doctorId` | `ObjectId` | Yes | Ref: `User`, Indexed | Reference to doctor User |
| `appointmentDate`| `String` | Yes | Regex `YYYY-MM-DD` | Consultation date (timezone-resilient string) |
| `appointmentTime`| `String` | Yes | Regex `HH:MM` | 24-hour consultation start time |
| `status` | `String` | Yes | Enum: `['pending', 'accepted', 'rejected', 'completed', 'cancelled']` | Current status in booking lifecycle |
| `notes` | `String` | No | Max: 500, Trim, Default: `''` | Reason for consultation or patient symptoms |
| `createdAt` | `Date` | Yes (Auto) | Timestamp | Booking creation timestamp |
| `updatedAt` | `Date` | Yes (Auto) | Timestamp | Last status change timestamp |

---

## 3. Database Indexes

### 3.1. Primary Compound Unique Constraint (Double-Booking Lock)
```javascript
appointmentSchema.index(
  {
    doctorId: 1,
    appointmentDate: 1,
    appointmentTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'accepted', 'completed'] },
    },
  }
);
```

#### Why This Works:
1. **Engine-Level Guarantee:** The uniqueness constraint is managed directly by MongoDB's B-Tree indexing engine. Two simultaneous booking queries can never write identical tuples.
2. **Partial Filter Expression:** When an appointment is set to `rejected` or `cancelled`, it no longer matches the index condition `{ status: { $in: ['pending', 'accepted', 'completed'] } }`. This frees the slot immediately for new bookings while preserving historical records for auditing.

---

### 3.2. Secondary Performance Indexes

| Collection | Index Keys | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Fast authentication lookup; prevents duplicate accounts |
| `doctorprofiles` | `{ userId: 1 }` | Unique | Fast 1-to-1 profile resolution |
| `doctorprofiles` | `{ specialization: 1 }` | Standard | Speeds up doctor directory filtering |
| `appointments` | `{ patientId: 1, appointmentDate: -1, createdAt: -1 }` | Compound | Fast sorting and pagination of patient history |
| `appointments` | `{ doctorId: 1, appointmentDate: 1, status: 1 }` | Compound | Fast queries for doctor's daily schedule and filters |

---

## 4. Appointment Status Lifecycle

```
           [Patient Books Slot]
                     │
                     ▼
                 [pending]
               ┌─────┴─────┐
[Doctor Accepts]           [Doctor Rejects]
       │                         │
       ▼                         ▼
   [accepted]               [rejected] ──► (Slot Released)
       │
   [Doctor Marks Completed]
       │
       ▼
  [completed]

* Note: Either patient or doctor may trigger [cancelled] from [pending] or [accepted],
  which also releases the slot immediately via partial index exclusion.
```
