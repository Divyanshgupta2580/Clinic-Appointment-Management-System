# Socket.IO & Real-Time Architecture Documentation

## 1. Overview & Setup

MediPulse Clinic integrates **Socket.IO (v4.8.1)** for bidirectional, low-latency WebSocket communication between the Node.js backend and connected browser clients.

### Server-Side Initialization
In `server.js`:
```javascript
const server = http.createServer(app);
initSocket(server);
```
In `sockets/socket.js`:
```javascript
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
...
```

---

## 2. Room Architecture & Isolation

Rather than broadcasting sensitive patient health interactions to a global channel, MediPulse uses **isolated rooms**:

| Room Identifier | Target Audience | Purpose | Security Context |
| :--- | :--- | :--- | :--- |
| `user:<userId>` | Specific Patient | Receives personal appointment updates (accepted, rejected, completed, cancelled) | Private to authenticated user |
| `doctor:<doctorId>` | Specific Doctor | Receives alerts when patients book consultations with them or cancel | Private to the specific physician |
| `role:admin` | Clinic Administrators | Receives clinic-wide alerts for oversight and audit trails | Restricted to users with `role: 'admin'` |

### Room Join Mechanism
When a client connects to Socket.IO:
1. **Handshake Authentication**: The client transmits `{ userId, role }` inside `socket.handshake.auth`.
2. **Explicit Client Registration**: In `public/js/realtime.js`, on `connect`, the client emits `register:user` with `{ userId, role }`.
3. The server assigns the socket to:
   - `user:${userId}` (All authenticated users)
   - `doctor:${userId}` (If `role === 'doctor'`)
   - `role:admin` (If `role === 'admin'`)

---

## 3. Event Matrix

| Event Name | Emitter | Recipient Room(s) | Trigger / Action | Payload Fields | Frontend UI Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `appointment:created` | Server | `doctor:<doctorId>`, `role:admin` | Patient submits booking | `appointmentId`, `patientName`, `doctorName`, `date`, `time`, `status`, `message` | Toast notification; banner injected into doctor table |
| `appointment:accepted` | Server | `user:<patientId>` | Doctor clicks "Accept" | `appointmentId`, `doctorName`, `date`, `time`, `status`, `message` | Success toast; badge updates to "Confirmed / Accepted" |
| `appointment:rejected` | Server | `user:<patientId>` | Doctor clicks "Reject" | `appointmentId`, `doctorName`, `date`, `time`, `status`, `message` | Danger toast; badge updates to "Declined"; actions disabled |
| `appointment:completed`| Server | `user:<patientId>` | Doctor clicks "Complete"| `appointmentId`, `doctorName`, `status`, `message` | Success toast; badge updates to "Completed"; actions disabled |
| `appointment:cancelled`| Server | `doctor:<doctorId>`, `user:<patientId>`, `role:admin` | Patient or Doctor cancels | `appointmentId`, `date`, `time`, `status`, `message` | Warning toast; badge updates to "Cancelled" |

---

## 4. Detailed Event Payloads

### `appointment:created`
```json
{
  "appointmentId": "6aa2666bd552b6d1df1447e2",
  "patientName": "Alice Johnson",
  "doctorName": "Dr. Sarah Smith",
  "date": "2026-11-20",
  "time": "09:00",
  "status": "pending",
  "message": "New appointment booked by Alice Johnson for 2026-11-20 at 09:00."
}
```

### `appointment:accepted`
```json
{
  "appointmentId": "6aa2666bd552b6d1df1447e2",
  "doctorName": "Sarah Smith",
  "date": "2026-11-20",
  "time": "09:00",
  "status": "accepted",
  "message": "Good news! Your appointment with Dr. Sarah Smith on 2026-11-20 at 09:00 has been accepted."
}
```

---

## 5. Client-Side DOM Integration (`public/js/realtime.js`)

The client listener automatically binds to tables and badges:

```javascript
function updateAppointmentStatusInDOM(appointmentId, newStatus) {
  const badgeElements = document.querySelectorAll(
    `[data-appointment-id="${appointmentId}"] .badge, [data-appointment-badge="${appointmentId}"]`
  );
  
  badgeElements.forEach((badge) => {
    badge.className = `badge badge-${newStatus}`;
    badge.setAttribute('data-status', newStatus);

    const labels = {
      pending: 'Pending Review',
      accepted: 'Confirmed / Accepted',
      completed: 'Completed',
      rejected: 'Declined',
      cancelled: 'Cancelled',
    };

    badge.innerHTML = `<span class="badge-dot"></span> ${labels[newStatus] || newStatus}`;
  });
}
```

### Advantages of This Implementation:
1. **No Page Reload Necessary**: The patient can remain on their dashboard; when the doctor clicks Accept in their clinic office, the patient's screen immediately transitions the badge color and label.
2. **Audio-Visual Confirmation**: Toast alerts slide into the top right viewport and automatically dissolve after 6 seconds.
3. **Graceful Degradation**: If WebSockets fail or are blocked by client firewall, the SSR pages still provide 100% full functionality upon standard HTTP navigation.
