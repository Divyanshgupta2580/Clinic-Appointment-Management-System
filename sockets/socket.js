const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with HTTP Server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const auth = socket.handshake.auth || {};
    const { userId, role } = auth;

    if (userId) {
      socket.join(`user:${userId}`);
      if (role === 'doctor') {
        socket.join(`doctor:${userId}`);
      }
      if (role === 'admin') {
        socket.join('role:admin');
      }
    }

    // Explicit room registration from client script
    socket.on('register:user', ({ userId, role }) => {
      if (userId) {
        socket.join(`user:${userId}`);
        if (role === 'doctor') {
          socket.join(`doctor:${userId}`);
        }
        if (role === 'admin') {
          socket.join('role:admin');
        }
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

/**
 * Returns active Socket.IO server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Emit event to Doctor and Admin when a new appointment is created
 */
const emitAppointmentCreated = (appointment) => {
  if (!io) return;
  const doctorRoom = `doctor:${appointment.doctorId}`;
  io.to(doctorRoom).to('role:admin').emit('appointment:created', {
    appointmentId: appointment._id,
    patientName: appointment.patientName,
    doctorName: appointment.doctorName,
    date: appointment.appointmentDate,
    time: appointment.appointmentTime,
    status: appointment.status,
    message: `New appointment booked by ${appointment.patientName} for ${appointment.appointmentDate} at ${appointment.appointmentTime}.`,
  });
};

/**
 * Emit event to Patient when appointment is accepted
 */
const emitAppointmentAccepted = (appointment) => {
  if (!io) return;
  const patientRoom = `user:${appointment.patientId}`;
  io.to(patientRoom).emit('appointment:accepted', {
    appointmentId: appointment._id,
    doctorName: appointment.doctorName,
    date: appointment.appointmentDate,
    time: appointment.appointmentTime,
    status: 'accepted',
    message: `Good news! Your appointment with Dr. ${appointment.doctorName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been accepted.`,
  });
};

/**
 * Emit event to Patient when appointment is rejected
 */
const emitAppointmentRejected = (appointment) => {
  if (!io) return;
  const patientRoom = `user:${appointment.patientId}`;
  io.to(patientRoom).emit('appointment:rejected', {
    appointmentId: appointment._id,
    doctorName: appointment.doctorName,
    date: appointment.appointmentDate,
    time: appointment.appointmentTime,
    status: 'rejected',
    message: `Your appointment with Dr. ${appointment.doctorName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} could not be accepted.`,
  });
};

/**
 * Emit event to Patient when appointment is marked completed
 */
const emitAppointmentCompleted = (appointment) => {
  if (!io) return;
  const patientRoom = `user:${appointment.patientId}`;
  io.to(patientRoom).emit('appointment:completed', {
    appointmentId: appointment._id,
    doctorName: appointment.doctorName,
    status: 'completed',
    message: `Your consultation with Dr. ${appointment.doctorName} has been marked completed. Thank you for visiting MediPulse Clinic!`,
  });
};

/**
 * Emit event when appointment is cancelled
 */
const emitAppointmentCancelled = (appointment) => {
  if (!io) return;
  const doctorRoom = `doctor:${appointment.doctorId}`;
  const patientRoom = `user:${appointment.patientId}`;

  io.to(doctorRoom).to(patientRoom).to('role:admin').emit('appointment:cancelled', {
    appointmentId: appointment._id,
    date: appointment.appointmentDate,
    time: appointment.appointmentTime,
    status: 'cancelled',
    message: `Appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime} was cancelled.`,
  });
};

module.exports = {
  initSocket,
  getIO,
  emitAppointmentCreated,
  emitAppointmentAccepted,
  emitAppointmentRejected,
  emitAppointmentCompleted,
  emitAppointmentCancelled,
};
