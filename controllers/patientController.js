const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Patient Dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const patientId = req.session.user._id;

  // Run targeted aggregation/counts
  const [totalBookings, pendingCount, upcomingCount, recentAppointments] = await Promise.all([
    Appointment.countDocuments({ patientId }),
    Appointment.countDocuments({ patientId, status: 'pending' }),
    Appointment.countDocuments({
      patientId,
      status: { $in: ['pending', 'accepted'] },
    }),
    Appointment.find({ patientId })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(5)
      .populate('doctorId', 'name email')
      .lean(),
  ]);

  // Fetch doctor profiles for recent appointments efficiently to avoid N+1 queries
  const doctorIds = recentAppointments.map((a) => a.doctorId?._id).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } })
    .select('userId specialization')
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p.specialization));

  const enrichedAppointments = recentAppointments.map((a) => ({
    ...a,
    specialization: a.doctorId ? profileMap.get(a.doctorId._id.toString()) || 'General Practice' : 'Doctor',
  }));

  res.render('patient/dashboard', {
    title: 'Patient Dashboard - MediPulse Clinic',
    stats: {
      totalBookings,
      pendingCount,
      upcomingCount,
    },
    recentAppointments: enrichedAppointments,
  });
});

/**
 * Browse available doctors with search and specialization filter
 */
const getDoctors = asyncHandler(async (req, res) => {
  const { specialization, search } = req.query;

  // Build doctor profile query
  const filter = {};
  if (specialization && specialization.trim()) {
    filter.specialization = new RegExp(specialization.trim(), 'i');
  }

  // Fetch doctor profiles populated with User info
  let doctorProfiles = await DoctorProfile.find(filter)
    .populate('userId', 'name email')
    .lean();

  // Additional name search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    doctorProfiles = doctorProfiles.filter(
      (d) =>
        d.userId?.name?.toLowerCase().includes(q) ||
        d.specialization?.toLowerCase().includes(q)
    );
  }

  // Extract unique specializations for filter dropdown
  const allSpecializations = await DoctorProfile.distinct('specialization');

  res.render('patient/doctors', {
    title: 'Find Doctors - MediPulse Clinic',
    doctors: doctorProfiles,
    specializations: allSpecializations,
    selectedSpecialization: specialization || '',
    searchQuery: search || '',
  });
});

/**
 * View Doctor Profile & Booking Form
 */
const getDoctorDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doctorUser = await User.findById(id).select('name email role').lean();
  if (!doctorUser || doctorUser.role !== 'doctor') {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Doctor profile not found.'];
    return res.status(404).redirect('/patient/doctors');
  }

  const profile = await DoctorProfile.findOne({ userId: id }).lean();

  const preselectedDate = req.query.date || '';
  const preselectedTime = req.query.time || '';

  res.render('patient/doctorDetails', {
    title: `Book Dr. ${doctorUser.name} - MediPulse Clinic`,
    doctor: doctorUser,
    profile: profile || {
      specialization: 'General Practice',
      qualification: 'MBBS',
      experience: 1,
      consultationDuration: 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: '09:00',
      availableEndTime: '17:00',
    },
    preselectedDate,
    preselectedTime,
  });
});

/**
 * Patient Appointment History with status filter and pagination
 */
const getAppointments = asyncHandler(async (req, res) => {
  const patientId = req.session.user._id;
  const { status, page = 1 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const limit = 8;
  const skip = (currentPage - 1) * limit;

  const filter = { patientId };
  if (status && ['pending', 'accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  const [totalAppointments, appointments] = await Promise.all([
    Appointment.countDocuments(filter),
    Appointment.find(filter)
      .sort({ appointmentDate: -1, appointmentTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctorId', 'name email')
      .lean(),
  ]);

  const totalPages = Math.ceil(totalAppointments / limit) || 1;

  // Enrich with doctor specialization
  const doctorIds = appointments.map((a) => a.doctorId?._id).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } })
    .select('userId specialization')
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p.specialization));

  const enrichedAppointments = appointments.map((a) => ({
    ...a,
    specialization: a.doctorId ? profileMap.get(a.doctorId._id.toString()) || 'General Practice' : 'Doctor',
  }));

  res.render('patient/history', {
    title: 'Appointment History - MediPulse Clinic',
    appointments: enrichedAppointments,
    currentStatus: status || 'all',
    pagination: {
      currentPage,
      totalPages,
      totalCount: totalAppointments,
    },
  });
});

module.exports = {
  getDashboard,
  getDoctors,
  getDoctorDetails,
  getAppointments,
};
