const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Public Landing Page with Dynamic Doctor Highlights and System Stats
router.get('/', async (req, res) => {
  try {
    const [featuredDoctors, totalDoctors, totalPatients, totalAppointments] = await Promise.all([
      DoctorProfile.find().populate('userId', 'name email').limit(4).lean(),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments(),
    ]);

    res.render('index', {
      title: 'MediPulse Clinic - Modern Healthcare Management',
      featuredDoctors: featuredDoctors || [],
      stats: {
        totalDoctors: totalDoctors || 12,
        totalPatients: totalPatients || 48,
        totalAppointments: totalAppointments || 120,
      },
    });
  } catch (err) {
    // Graceful fallback if database read fails or empty
    res.render('index', {
      title: 'MediPulse Clinic - Modern Healthcare Management',
      featuredDoctors: [],
      stats: {
        totalDoctors: 12,
        totalPatients: 48,
        totalAppointments: 120,
      },
    });
  }
});

// Authentication routes at root level for clean URLs
router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', authLimiter, validateLogin, authController.postLogin);
router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', authLimiter, validateRegister, authController.postRegister);
router.post('/logout', authController.postLogout);
router.get('/logout', authController.postLogout);

// JSON API endpoint to retrieve available slots for a doctor and date
router.get('/api/doctors/:id/available-slots', appointmentController.getAvailableSlotsApi);

module.exports = router;
