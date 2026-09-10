const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Render Login view
 */
const getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Log In - MediPulse Clinic',
    formData: {},
  });
};

/**
 * Process Login
 */
const postLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Invalid email or password.'];
    return res.status(401).render('auth/login', {
      title: 'Log In - MediPulse Clinic',
      formData: { email },
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['Invalid email or password.'];
    return res.status(401).render('auth/login', {
      title: 'Log In - MediPulse Clinic',
      formData: { email },
    });
  }

  // Save session
  req.session.user = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  req.session.flash = req.session.flash || {};
  req.session.flash.success = [`Welcome back, ${user.name}!`];

  // Redirect based on role or intended URL
  const redirectUrl = req.query.redirect;
  if (redirectUrl && redirectUrl.startsWith('/')) {
    return res.redirect(redirectUrl);
  }

  if (user.role === 'doctor') {
    return res.redirect('/doctor/dashboard');
  }
  if (user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/patient/dashboard');
});

/**
 * Render Register view
 */
const getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register - MediPulse Clinic',
    formData: {},
  });
};

/**
 * Process Registration
 */
const postRegister = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'patient',
    specialization,
    qualification,
    experience,
    consultationDuration,
    availableStartTime,
    availableEndTime,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    req.session.flash = req.session.flash || {};
    req.session.flash.error = ['An account with this email address already exists. Please log in instead.'];
    return res.status(400).render('auth/register', {
      title: 'Register - MediPulse Clinic',
      formData: req.body,
    });
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Create User
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: ['doctor', 'admin'].includes(role) ? role : 'patient',
  });

  // If registering as doctor, create DoctorProfile
  if (newUser.role === 'doctor') {
    await DoctorProfile.create({
      userId: newUser._id,
      specialization: specialization ? specialization.trim() : 'General Physician',
      qualification: qualification ? qualification.trim() : 'MBBS',
      experience: experience ? Number(experience) : 1,
      consultationDuration: consultationDuration ? Number(consultationDuration) : 30,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableStartTime: availableStartTime || '09:00',
      availableEndTime: availableEndTime || '17:00',
    });
  }

  // Auto-login new user
  req.session.user = {
    _id: newUser._id.toString(),
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  };

  req.session.flash = req.session.flash || {};
  req.session.flash.success = [`Registration successful! Welcome to MediPulse Clinic, ${newUser.name}.`];

  if (newUser.role === 'doctor') {
    return res.redirect('/doctor/dashboard');
  }
  if (newUser.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/patient/dashboard');
});

/**
 * Process Logout
 */
const postLogout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Session] Error destroying session:', err);
      }
      res.clearCookie('medipulse.sid');
      res.clearCookie('connect.sid');
      return res.redirect('/auth/login?success=Logged out successfully.');
    });
  } else {
    return res.redirect('/auth/login');
  }
};

module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  postLogout,
};
