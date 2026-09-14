import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { DoctorProfile } from '../models/DoctorProfile';
import { Appointment } from '../models/Appointment';
import { QueueEntry } from '../models/QueueEntry';
import { AuditLog } from '../models/AuditLog';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logAudit } from '../services/auditService';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (role && typeof role === 'string') {
      query.role = role;
    }
    if (search && typeof search === 'string') {
      const q = search.trim();
      query.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      users,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['patient', 'doctor', 'receptionist', 'admin'];
    if (!role || !validRoles.includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // If upgraded to doctor and no profile exists, create default profile
    if (role === 'doctor') {
      const existingProfile = await DoctorProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        await DoctorProfile.create({
          userId: user._id,
          specialization: 'General Practice',
          qualification: 'MBBS',
          experience: 1,
          consultationDuration: 30,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          availableStartTime: '09:00',
          availableEndTime: '17:00',
        });
      }
    }

    await logAudit(
      'USER_ROLE_UPDATED',
      'User',
      actor._id,
      actor.role,
      user._id.toString(),
      { from: oldRole, to: role }
    );

    res.status(200).json({
      success: true,
      message: `User role changed from ${oldRole} to ${role}.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { action, resource, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (action && typeof action === 'string') query.action = action;
    if (resource && typeof resource === 'string') query.resource = resource;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email role')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      logs,
    });
  } catch (err) {
    next(err);
  }
};

export const getSystemStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalPatients, totalDoctors, totalReceptionists, totalAppointments, activeQueueToday] =
      await Promise.all([
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'doctor' }),
        User.countDocuments({ role: 'receptionist' }),
        Appointment.countDocuments(),
        QueueEntry.countDocuments({
          date: new Date().toISOString().split('T')[0],
          status: { $in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
        }),
      ]);

    res.status(200).json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        totalReceptionists,
        totalAppointments,
        activeQueueToday,
      },
    });
  } catch (err) {
    next(err);
  }
};
