import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  updateDoctorAvailability,
  addDoctorDateOverride,
} from '../controllers/doctorController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

// Public doctor directory & search
router.get('/', getDoctors);
router.get('/:id', getDoctorById);

// Protected schedule & availability update (Doctor or Admin)
router.patch('/:id/availability', requireAuth, requireRole(['doctor', 'admin']), updateDoctorAvailability);
router.post('/:id/schedule-override', requireAuth, requireRole(['doctor', 'admin']), addDoctorDateOverride);

export default router;
