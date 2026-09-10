const Appointment = require('../models/Appointment');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { getDoctorSlotsForDate, findNextAvailableSlot } = require('../utils/slotUtils');
const {
  emitAppointmentCreated,
  emitAppointmentAccepted,
  emitAppointmentRejected,
  emitAppointmentCompleted,
  emitAppointmentCancelled,
} = require('../sockets/socket');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Book an Appointment (Patient action)
 * Protected by MongoDB compound unique index { doctorId, appointmentDate, appointmentTime }
 */
const bookAppointment = asyncHandler(async (req, res) => {
  const patientId = req.session.user._id;
  const { doctorId, appointmentDate, appointmentTime, notes } = req.body;

  // Verify doctor exists and has doctor role
  const doctor = await User.findById(doctorId).select('name email role').lean();
  if (!doctor || doctor.role !== 'doctor') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Selected doctor does not exist.'];
    return res.status(404).redirect('/patient/doctors');
  }

  try {
    // Attempt database insertion directly to prevent check-then-insert race conditions
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      notes: notes ? notes.trim() : '',
      status: 'pending',
    });

    // Notify doctor and admins in real-time via Socket.IO
    emitAppointmentCreated({
      _id: appointment._id.toString(),
      doctorId: doctor._id.toString(),
      patientId: patientId.toString(),
      doctorName: doctor.name,
      patientName: req.session.user.name,
      appointmentDate,
      appointmentTime,
      status: 'pending',
    });

    req.session.flash = req.session.flash || {};
    req.session.flash.success = [
      `Appointment booked successfully with Dr. ${doctor.name} for ${appointmentDate} at ${appointmentTime}!`,
    ];

    return res.redirect('/patient/appointments');
  } catch (err) {
    // DATABASE CONSTRAINT CONFLICT: Catch MongoDB Duplicate Key Error (E11000)
    if (err.code === 11000) {
      console.warn(`[Double-Booking Prevented] Conflict on doctor=${doctorId}, date=${appointmentDate}, time=${appointmentTime}`);

      // STRETCH REQUIREMENT: Automatically suggest next available slot
      const suggestedSlot = await findNextAvailableSlot(doctorId, appointmentDate, appointmentTime);

      const isApi = req.xhr || req.headers.accept?.includes('application/json');
      if (isApi) {
        return res.status(409).json({
          success: false,
          message: 'The selected appointment slot was just booked by another patient and is no longer available.',
          suggestedSlot,
        });
      }

      req.session.flash = req.session.flash || {};
      req.session.flash.error = [
        'The selected appointment slot was just booked by another patient and is no longer available.',
      ];

      if (suggestedSlot) {
        req.session.flash.suggestedSlot = {
          date: suggestedSlot.date,
          time: suggestedSlot.time,
          doctorId: doctorId.toString(),
        };
      }

      return res.redirect(`/patient/doctors/${doctorId}?date=${appointmentDate}`);
    }

    // Pass any other unhandled error
    throw err;
  }
});

/**
 * Accept an Appointment (Doctor / Admin action)
 */
const acceptAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.session.user._id;
  const isAdmin = req.session.user.role === 'admin';

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');

  if (!appointment) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Appointment record not found.'];
    return res.status(404).redirect('/doctor/appointments');
  }

  // Authorization check: doctor must own the appointment unless admin
  if (!isAdmin && appointment.doctorId._id.toString() !== currentUserId) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['You are not authorized to manage this appointment.'];
    return res.status(403).redirect('/doctor/appointments');
  }

  // Validate state transition
  if (appointment.status !== 'pending') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = [`Cannot accept an appointment currently marked as ${appointment.status}.`];
    return res.status(400).redirect('/doctor/appointments');
  }

  appointment.status = 'accepted';
  await appointment.save();

  // Real-time notification to patient via Socket.IO
  emitAppointmentAccepted({
    _id: appointment._id.toString(),
    patientId: appointment.patientId._id.toString(),
    doctorName: appointment.doctorId.name,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
  });

  req.session.flash = req.session.flash || {};
  req.session.flash.success = [`Appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime} accepted.`];
  return res.redirect('/doctor/appointments');
});

/**
 * Reject an Appointment (Doctor / Admin action)
 */
const rejectAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.session.user._id;
  const isAdmin = req.session.user.role === 'admin';

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');

  if (!appointment) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Appointment record not found.'];
    return res.status(404).redirect('/doctor/appointments');
  }

  if (!isAdmin && appointment.doctorId._id.toString() !== currentUserId) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['You are not authorized to manage this appointment.'];
    return res.status(403).redirect('/doctor/appointments');
  }

  if (appointment.status !== 'pending') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = [`Cannot reject an appointment currently marked as ${appointment.status}.`];
    return res.status(400).redirect('/doctor/appointments');
  }

  appointment.status = 'rejected';
  await appointment.save();

  // Real-time notification to patient
  emitAppointmentRejected({
    _id: appointment._id.toString(),
    patientId: appointment.patientId._id.toString(),
    doctorName: appointment.doctorId.name,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
  });

  req.session.flash = req.session.flash || {};
  req.session.flash.info = [`Appointment declined. The slot has been freed up.`];
  return res.redirect('/doctor/appointments');
});

/**
 * Mark Appointment Completed (Doctor / Admin action)
 */
const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.session.user._id;
  const isAdmin = req.session.user.role === 'admin';

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');

  if (!appointment) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Appointment record not found.'];
    return res.status(404).redirect('/doctor/appointments');
  }

  if (!isAdmin && appointment.doctorId._id.toString() !== currentUserId) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['You are not authorized to manage this appointment.'];
    return res.status(403).redirect('/doctor/appointments');
  }

  if (appointment.status !== 'accepted') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = [`Only accepted appointments can be completed.`];
    return res.status(400).redirect('/doctor/appointments');
  }

  appointment.status = 'completed';
  await appointment.save();

  // Real-time notification to patient
  emitAppointmentCompleted({
    _id: appointment._id.toString(),
    patientId: appointment.patientId._id.toString(),
    doctorName: appointment.doctorId.name,
  });

  req.session.flash = req.session.flash || {};
  req.session.flash.success = [`Appointment marked as completed.`];
  return res.redirect('/doctor/appointments');
});

/**
 * Cancel an Appointment (Patient or Doctor / Admin)
 */
const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.session.user._id;
  const userRole = req.session.user.role;

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');

  const fallbackUrl = userRole === 'doctor' || userRole === 'admin' ? '/doctor/appointments' : '/patient/appointments';

  if (!appointment) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Appointment record not found.'];
    return res.status(404).redirect(req.get('Referrer') || fallbackUrl);
  }

  // Access check
  const isPatientOwner = appointment.patientId._id.toString() === currentUserId;
  const isDoctorAssigned = appointment.doctorId._id.toString() === currentUserId;
  const isAdmin = userRole === 'admin';

  if (!isPatientOwner && !isDoctorAssigned && !isAdmin) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['You are not authorized to cancel this appointment.'];
    return res.status(403).redirect(req.get('Referrer') || fallbackUrl);
  }

  if (appointment.status === 'completed' || appointment.status === 'rejected' || appointment.status === 'cancelled') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = [`Cannot cancel an appointment that is already ${appointment.status}.`];
    return res.status(400).redirect(req.get('Referrer') || fallbackUrl);
  }

  appointment.status = 'cancelled';
  await appointment.save();

  // Real-time notification
  emitAppointmentCancelled({
    _id: appointment._id.toString(),
    patientId: appointment.patientId._id.toString(),
    doctorId: appointment.doctorId._id.toString(),
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
  });

  req.session.flash = req.session.flash || {};
  req.session.flash.info = ['Appointment has been cancelled and the slot is now open.'];

  if (userRole === 'patient') {
    return res.redirect('/patient/appointments');
  }
  return res.redirect('/doctor/appointments');
});

/**
 * View Single Appointment Details
 */
const getAppointmentDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.session.user._id;
  const userRole = req.session.user.role;

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email')
    .lean();

  if (!appointment) {
    return res.status(404).render('errors/404', {
      title: '404 - Not Found',
      path: req.originalUrl,
    });
  }

  // Access check
  const isPatientOwner = appointment.patientId?._id?.toString() === currentUserId;
  const isDoctorAssigned = appointment.doctorId?._id?.toString() === currentUserId;
  const isAdmin = userRole === 'admin';

  if (!isPatientOwner && !isDoctorAssigned && !isAdmin) {
    return res.status(403).render('errors/403', {
      title: '403 - Forbidden',
      message: 'You are not authorized to view this appointment.',
    });
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: appointment.doctorId?._id }).lean();

  res.render('appointments/details', {
    title: `Appointment Details - #${appointment._id.toString().slice(-6)}`,
    appointment,
    doctorProfile,
    isPatientOwner,
    isDoctorAssigned,
    isAdmin,
  });
});

/**
 * JSON API: Query available slots for a doctor and date
 */
const getAvailableSlotsApi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: 'A valid date in YYYY-MM-DD format is required.',
    });
  }

  const slotData = await getDoctorSlotsForDate(id, date);

  return res.json({
    success: true,
    date,
    ...slotData,
  });
});

module.exports = {
  bookAppointment,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  cancelAppointment,
  getAppointmentDetails,
  getAvailableSlotsApi,
};
