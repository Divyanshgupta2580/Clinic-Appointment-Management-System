const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireDoctorOrAdmin } = require('../middleware/role');
const { validateAppointment } = require('../middleware/validation');

// All appointment management routes require authentication
router.use(requireAuth);

router.post('/book', requireRole('patient'), validateAppointment, appointmentController.bookAppointment);

router.post('/:id/accept', requireDoctorOrAdmin, appointmentController.acceptAppointment);
router.post('/:id/reject', requireDoctorOrAdmin, appointmentController.rejectAppointment);
router.post('/:id/complete', requireDoctorOrAdmin, appointmentController.completeAppointment);

router.post('/:id/cancel', appointmentController.cancelAppointment);
router.get('/:id', appointmentController.getAppointmentDetails);

module.exports = router;
