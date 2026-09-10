const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Admin Dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    totalAppointments,
    pendingCount,
    acceptedCount,
    completedCount,
    doctorsList,
  ] = await Promise.all([
    User.countDocuments({ role: 'patient' }),
    User.countDocuments({ role: 'doctor' }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'pending' }),
    Appointment.countDocuments({ status: 'accepted' }),
    Appointment.countDocuments({ status: 'completed' }),
    User.find({ role: 'doctor' }).select('name email createdAt').lean(),
  ]);

  // Fetch profiles for doctors list
  const doctorIds = doctorsList.map((d) => d._id);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).lean();
  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

  const enrichedDoctors = doctorsList.map((doc) => ({
    ...doc,
    profile: profileMap.get(doc._id.toString()) || null,
  }));

  res.render('admin/dashboard', {
    title: 'Admin Dashboard - MediPulse Clinic',
    stats: {
      totalPatients,
      totalDoctors,
      totalAppointments,
      pendingCount,
      acceptedCount,
      completedCount,
    },
    doctors: enrichedDoctors,
  });
});

module.exports = {
  getDashboard,
};
