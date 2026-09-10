const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');
const { requireDoctorOrAdmin } = require('../middleware/role');

// All doctor routes require authentication and doctor or admin role
router.use(requireAuth, requireDoctorOrAdmin);

router.get('/dashboard', doctorController.getDashboard);
router.get('/appointments', doctorController.getAppointments);
router.get('/appointments/:id', appointmentController.getAppointmentDetails);
router.post('/appointments/:id/accept', appointmentController.acceptAppointment);
router.post('/appointments/:id/reject', appointmentController.rejectAppointment);
router.post('/appointments/:id/complete', appointmentController.completeAppointment);

router.get('/profile', doctorController.getProfile);
router.post('/profile', doctorController.updateProfile);

module.exports = router;
