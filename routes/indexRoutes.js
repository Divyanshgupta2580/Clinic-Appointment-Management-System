const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// Public Landing Page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'MediPulse Clinic - Modern Healthcare Management',
  });
});

// Authentication routes at root level for clean URLs
router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', authLimiter, validateLogin, authController.postLogin);
router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', authLimiter, validateRegister, authController.postRegister);
router.post('/logout', authController.postLogout);
router.get('/logout', authController.postLogout);

// JSON API endpoint to retrieve available slots for a doctor and date
router.get('/api/doctors/:id/available-slots', appointmentController.getAvailableSlotsApi);

module.exports = router;
