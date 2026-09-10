const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateAppointment } = require('../middleware/validation');

// All patient routes require authentication and patient role
router.use(requireAuth, requireRole('patient'));

router.get('/dashboard', patientController.getDashboard);
router.get('/doctors', patientController.getDoctors);
router.get('/doctors/:id', patientController.getDoctorDetails);
router.get('/appointments', patientController.getAppointments);
router.get('/appointments/:id', appointmentController.getAppointmentDetails);
router.post('/appointments', validateAppointment, appointmentController.bookAppointment);

module.exports = router;
