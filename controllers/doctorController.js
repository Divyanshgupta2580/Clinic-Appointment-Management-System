const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to get today's date in YYYY-MM-DD
 */
const getTodayStr = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Doctor Dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.session.user._id;
  const todayStr = getTodayStr();

  // Run targeted aggregation/counts
  const [todayCount, pendingCount, completedCount, upcomingToday] = await Promise.all([
    Appointment.countDocuments({ doctorId, appointmentDate: todayStr }),
    Appointment.countDocuments({ doctorId, status: 'pending' }),
    Appointment.countDocuments({ doctorId, status: 'completed' }),
    Appointment.find({
      doctorId,
      appointmentDate: todayStr,
      status: { $in: ['pending', 'accepted'] },
    })
      .sort({ appointmentTime: 1 })
      .populate('patientId', 'name email')
      .lean(),
  ]);

  res.render('doctor/dashboard', {
    title: 'Doctor Dashboard - MediPulse Clinic',
    todayStr,
    stats: {
      todayCount,
      pendingCount,
      completedCount,
    },
    todayAppointments: upcomingToday,
  });
});

/**
 * Doctor Appointments Management List with filters and pagination
 */
const getAppointments = asyncHandler(async (req, res) => {
  const doctorId = req.session.user._id;
  const isAdmin = req.session.user.role === 'admin';
  const { status, date, page = 1 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const limit = 10;
  const skip = (currentPage - 1) * limit;

  const filter = {};
  // If not admin, restrict to logged-in doctor
  if (!isAdmin) {
    filter.doctorId = doctorId;
  }

  if (status && ['pending', 'accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  if (date) {
    filter.appointmentDate = date;
  }

  const [totalCount, appointments] = await Promise.all([
    Appointment.countDocuments(filter),
    Appointment.find(filter)
      .sort({ appointmentDate: 1, appointmentTime: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  res.render('doctor/appointments', {
    title: 'Manage Appointments - MediPulse Clinic',
    appointments,
    currentStatus: status || 'all',
    selectedDate: date || '',
    isAdmin,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
    },
  });
});

/**
 * View Doctor Schedule & Profile Settings
 */
const getProfile = asyncHandler(async (req, res) => {
  const doctorId = req.session.user._id;

  let profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  if (!profile) {
    profile = await DoctorProfile.create({
      userId: doctorId,
      specialization: 'General Physician',
      qualification: 'MBBS',
      experience: 1,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '17:00',
    });
  }

  res.render('doctor/profile', {
    title: 'Schedule & Availability - MediPulse Clinic',
    profile,
  });
});

/**
 * Update Doctor Schedule & Profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const doctorId = req.session.user._id;
  const {
    specialization,
    qualification,
    experience,
    consultationDuration,
    availableDays,
    availableStartTime,
    availableEndTime,
  } = req.body;

  // Available days normalization
  const days = Array.isArray(availableDays)
    ? availableDays
    : availableDays
    ? [availableDays]
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  await DoctorProfile.findOneAndUpdate(
    { userId: doctorId },
    {
      specialization: specialization ? specialization.trim() : 'General Practice',
      qualification: qualification ? qualification.trim() : 'MBBS',
      experience: experience ? Number(experience) : 1,
      consultationDuration: consultationDuration ? Number(consultationDuration) : 30,
      availableDays: days,
      availableStartTime: availableStartTime || '09:00',
      availableEndTime: availableEndTime || '17:00',
    },
    { upsert: true, new: true, runValidators: true }
  );

  req.session.flash = req.session.flash || {};
  req.session.flash.success = ['Your clinical schedule and profile have been updated successfully.'];
  res.redirect('/doctor/profile');
});

module.exports = {
  getDashboard,
  getAppointments,
  getProfile,
  updateProfile,
};
