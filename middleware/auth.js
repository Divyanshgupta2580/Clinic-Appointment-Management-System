/**
 * Middleware to require authenticated session
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    const isApi = req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json');
    if (isApi) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    if (req.session) {
      req.session.flash = req.session.flash || {};
      req.session.flash.error = ['Please log in to access this page.'];
    }
    return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
};

/**
 * Middleware to redirect already authenticated users away from login/register pages
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'doctor') {
      return res.redirect('/doctor/dashboard');
    }
    if (role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/patient/dashboard');
  }
  next();
};

/**
 * Middleware to bind current user and flash messages to res.locals for EJS views
 */
const sessionLocals = (req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user || null : null;

  // Flash messages handling
  if (req.session && req.session.flash) {
    res.locals.flash = { ...req.session.flash };
    delete req.session.flash; // Clear once consumed
  } else {
    res.locals.flash = { success: [], error: [], info: [], suggestedSlot: null };
  }

  // Handle URL query parameters as fallback flash messages (e.g. ?success=Registered)
  if (req.query.success) {
    res.locals.flash.success = res.locals.flash.success || [];
    res.locals.flash.success.push(req.query.success);
  }
  if (req.query.error) {
    res.locals.flash.error = res.locals.flash.error || [];
    res.locals.flash.error.push(req.query.error);
  }

  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  sessionLocals,
};
