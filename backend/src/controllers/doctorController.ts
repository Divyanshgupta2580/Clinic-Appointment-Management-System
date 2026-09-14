import { Request, Response, NextFunction } from 'express';
import { DoctorProfile } from '../models/DoctorProfile';
import { User } from '../models/User';
import { Availability } from '../models/Availability';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getDoctorSlotsForDate } from '../services/slotService';

export const getDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { specialization, search, clinicId } = req.query;

    const filter: any = {};
    if (specialization && typeof specialization === 'string') {
      filter.specialization = new RegExp(specialization.trim(), 'i');
    }
    if (clinicId && typeof clinicId === 'string') {
      filter.clinicId = clinicId;
    }

    let profiles = await DoctorProfile.find(filter)
      .populate('userId', 'name email phone')
      .populate('clinicId', 'name address')
      .lean();

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      profiles = profiles.filter(
        (p: any) =>
          p.userId?.name?.toLowerCase().includes(q) ||
          p.specialization.toLowerCase().includes(q)
      );
    }

    const specializations = await DoctorProfile.distinct('specialization');

    res.status(200).json({
      success: true,
      doctors: profiles,
      specializations,
    });
  } catch (err) {
    next(err);
  }
};

export const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const profile = await DoctorProfile.findOne({
      $or: [{ _id: id }, { userId: id }],
    })
      .populate('userId', 'name email phone')
      .populate('clinicId', 'name address phone')
      .lean();

    if (!profile) {
      throw new NotFoundError('Doctor profile not found.');
    }

    res.status(200).json({
      success: true,
      doctor: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDoctorAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;
    const isOwner = currentUserId === id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only modify your own availability.');
    }

    const { availableDays, availableStartTime, availableEndTime, consultationDuration } = req.body;

    const profile = await DoctorProfile.findOne({
      $or: [{ _id: id }, { userId: id }],
    });

    if (!profile) {
      throw new NotFoundError('Doctor profile not found.');
    }

    if (availableDays) profile.availableDays = availableDays;
    if (availableStartTime) profile.availableStartTime = availableStartTime;
    if (availableEndTime) profile.availableEndTime = availableEndTime;
    if (consultationDuration) profile.consultationDuration = Number(consultationDuration);

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Schedule and availability updated successfully.',
      doctor: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const addDoctorDateOverride = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;
    const isOwner = currentUserId === id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only modify your own schedule.');
    }

    const { date, isAvailable, customStartTime, customEndTime, reason } = req.body;

    const override = await Availability.findOneAndUpdate(
      { doctorId: id, date },
      {
        doctorId: id,
        date,
        isAvailable: Boolean(isAvailable),
        customStartTime,
        customEndTime,
        reason,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Date availability override saved.',
      override,
    });
  } catch (err) {
    next(err);
  }
};
