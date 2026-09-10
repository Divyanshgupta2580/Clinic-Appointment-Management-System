const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', authLimiter, validateLogin, authController.postLogin);

router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', authLimiter, validateRegister, authController.postRegister);

router.post('/logout', authController.postLogout);

module.exports = router;
