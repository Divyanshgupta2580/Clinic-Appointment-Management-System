require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

// Middlewares
const { sessionLocals } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Routes
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();

// Trust reverse proxy for secure cookies in production (e.g. Render, Railway, Nginx, Vercel)
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY ? (Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY) : 1);
}

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for SSR inline scripts & Google Fonts compatibility
  })
);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Template engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration (Fail fast if SESSION_SECRET is missing)
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not defined in environment variables.');
}

app.use(
  session({
    name: 'medipulse.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Make session & flash data accessible to all EJS templates
app.use(sessionLocals);

// Unauthenticated health check endpoint for cloud uptime monitors & platform deployment probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount Application Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/admin', adminRoutes);
app.use('/appointments', appointmentRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
