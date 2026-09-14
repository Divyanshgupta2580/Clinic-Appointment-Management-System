import { Router } from 'express';
import { getDailySchedule, getClinicStats } from '../controllers/receptionistController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['receptionist', 'admin']));

router.get('/schedule', getDailySchedule);
router.get('/stats', getClinicStats);

export default router;
