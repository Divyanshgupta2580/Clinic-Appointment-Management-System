import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ValidationError } from '../utils/errors';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const errors: string[] = [];
  const { name, email, password, role, specialization, qualification, experience } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  const validRoles = ['patient', 'doctor', 'receptionist', 'admin'];
  if (role && !validRoles.includes(role)) {
    errors.push('Invalid user role specified.');
  }

  if (role === 'doctor') {
    if (!specialization || typeof specialization !== 'string' || specialization.trim().length < 2) {
      errors.push('Specialization is required for doctors.');
    }
    if (!qualification || typeof qualification !== 'string' || qualification.trim().length < 2) {
      errors.push('Medical qualification is required (e.g. MBBS, MD).');
    }
    if (experience === undefined || isNaN(Number(experience)) || Number(experience) < 0) {
      errors.push('Valid years of experience is required.');
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Registration validation failed', errors));
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const errors: string[] = [];
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Login validation failed', errors));
  }

  next();
};

export const validateAppointmentBooking = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors: string[] = [];
  const { doctorId, appointmentDate, appointmentTime, notes } = req.body;

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    errors.push('A valid doctor ID is required.');
  }

  if (!appointmentDate || !dateRegex.test(appointmentDate)) {
    errors.push('A valid appointment date formatted as YYYY-MM-DD is required.');
  }

  if (!appointmentTime || !timeRegex.test(appointmentTime)) {
    errors.push('A valid appointment time formatted as HH:MM is required.');
  }

  if (notes && notes.length > 500) {
    errors.push('Consultation notes cannot exceed 500 characters.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Appointment booking validation failed', errors));
  }

  next();
};
