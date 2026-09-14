import { Router } from 'express';
import {
  getUsers,
  updateUserRole,
  getAuditLogs,
  getSystemStats,
} from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getSystemStats);

export default router;
