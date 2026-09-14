import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAvailableSlots,
} from '../controllers/appointmentController';
import { requireAuth } from '../middleware/auth';
import { validateAppointmentBooking } from '../middleware/validation';

const router = Router();

// Public / Authenticated slots query
router.get('/available-slots', getAvailableSlots);

// Protected appointment endpoints
router.use(requireAuth);

router.post('/', validateAppointmentBooking, createAppointment);
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.patch('/:id/status', updateAppointmentStatus);

export default router;
