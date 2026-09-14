import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
