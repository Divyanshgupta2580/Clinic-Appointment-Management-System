import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { DoctorProfile } from '../models/DoctorProfile';
import { generateToken } from '../middleware/auth';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import { logAudit } from '../services/auditService';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
      phone,
      clinicId,
      specialization,
      qualification,
      experience,
      consultationDuration,
      availableStartTime,
      availableEndTime,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      throw new ConflictError('An account with this email address already exists. Please log in.');
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      phone: phone?.trim(),
      clinicId: clinicId || undefined,
    });

    if (newUser.role === 'doctor') {
      await DoctorProfile.create({
        userId: newUser._id,
        specialization: specialization?.trim() || 'General Practice',
        qualification: qualification?.trim() || 'MBBS',
        experience: Number(experience) || 1,
        consultationDuration: Number(consultationDuration) || 30,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableStartTime: availableStartTime || '09:00',
        availableEndTime: availableEndTime || '17:00',
        clinicId: clinicId || undefined,
      });
    }

    const authUser = {
      _id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      clinicId: newUser.clinicId?.toString(),
    };

    const token = generateToken(authUser);

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit(
      'USER_REGISTERED',
      'User',
      newUser._id,
      newUser.role,
      newUser._id.toString(),
      { role: newUser.role, email: newUser.email },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: authUser,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const authUser = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId?.toString(),
    };

    const token = generateToken(authUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit('USER_LOGIN', 'User', user._id, user.role, user._id.toString(), {}, req.ip);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: authUser,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated.');
    }

    const user = await User.findById(req.user._id).select('-passwordHash').lean();
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    let profile = null;
    if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      user: {
        ...user,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};
