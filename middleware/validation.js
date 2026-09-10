const mongoose = require('mongoose');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const validateRegister = (req, res, next) => {
  const errors = [];
  const { name, email, password, role, specialization, qualification, experience } = req.body;

  if (!name || name.trim().length < 2) {
    errors.push('Full Name must be at least 2 characters.');
  }

  if (!email || !emailRegex.test(email.trim())) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  const validRoles = ['patient', 'doctor', 'admin'];
  if (role && !validRoles.includes(role)) {
    errors.push('Invalid account role specified.');
  }

  if (role === 'doctor') {
    if (!specialization || specialization.trim().length < 2) {
      errors.push('Specialization is required for doctor accounts.');
    }
    if (!qualification || qualification.trim().length < 2) {
      errors.push('Qualification is required for doctor accounts (e.g. MBBS, MD).');
    }
    if (experience === undefined || experience === '' || isNaN(experience) || Number(experience) < 0) {
      errors.push('Valid years of experience is required.');
    }
  }

  if (errors.length > 0) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, errors });
    }
    req.session.flash = req.session.flash || {};
    req.session.flash.error = errors;
    return res.status(400).render('auth/register', {
      title: 'Register',
      errors,
      formData: req.body,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email.trim())) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || password.trim().length === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, errors });
    }
    req.session.flash = req.session.flash || {};
    req.session.flash.error = errors;
    return res.status(400).render('auth/login', {
      title: 'Log In',
      errors,
      formData: { email },
    });
  }

  next();
};

const validateAppointment = (req, res, next) => {
  const errors = [];
  const { doctorId, appointmentDate, appointmentTime, notes } = req.body;

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    errors.push('Invalid doctor selection.');
  }

  if (!appointmentDate || !dateRegex.test(appointmentDate)) {
    errors.push('A valid appointment date (YYYY-MM-DD) is required.');
  }

  if (!appointmentTime || !timeRegex.test(appointmentTime)) {
    errors.push('A valid appointment time (HH:MM) is required.');
  }

  if (notes && notes.length > 500) {
    errors.push('Reason/notes cannot exceed 500 characters.');
  }

  if (errors.length > 0) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, errors });
    }
    req.session.flash = req.session.flash || {};
    req.session.flash.error = errors;
    return res.status(400).redirect(req.get('Referrer') || '/patient/doctors');
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateAppointment,
};
