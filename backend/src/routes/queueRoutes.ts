import { Router } from 'express';
import {
  checkIn,
  createWalkIn,
  getTodayQueue,
  getMyQueueStatus,
  callNext,
  startVisit,
  completeVisit,
  markPatientNoShow,
  setDoctorDelayNotice,
} from '../controllers/queueController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.use(requireAuth);

// Patient / General check-in
router.post('/check-in', checkIn);
router.get('/my-status', getMyQueueStatus);

// Doctor & Staff Queue Management
router.get('/today', requireRole(['doctor', 'receptionist', 'admin']), getTodayQueue);
router.post('/walk-in', requireRole(['receptionist', 'admin']), createWalkIn);
router.post('/call-next', requireRole(['doctor', 'receptionist', 'admin']), callNext);
router.post('/:id/start', requireRole(['doctor', 'admin']), startVisit);
router.post('/:id/complete', requireRole(['doctor', 'admin']), completeVisit);
router.post('/:id/no-show', requireRole(['doctor', 'receptionist', 'admin']), markPatientNoShow);
router.post('/delay-notice', requireRole(['doctor', 'receptionist', 'admin']), setDoctorDelayNotice);

export default router;
