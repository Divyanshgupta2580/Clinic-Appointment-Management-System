/**
 * Role-based authorization middleware
 * @param {string|string[]} roles - Allowed role(s) ('patient', 'doctor', 'admin')
 */
const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      const isApi = req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json');
      if (isApi) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;
    if (!allowed.includes(userRole)) {
      const isApi = req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json');
      if (isApi) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of: ${allowed.join(', ')} role.`,
        });
      }

      return res.status(403).render('errors/403', {
        title: '403 - Forbidden',
        message: `Your account (${userRole}) does not have permission to view or manage this area.`,
      });
    }

    next();
  };
};

const requireDoctorOrAdmin = requireRole(['doctor', 'admin']);

module.exports = {
  requireRole,
  requireDoctorOrAdmin,
};
