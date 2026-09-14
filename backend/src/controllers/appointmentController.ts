import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { User } from '../models/User';
import { getDoctorSlotsForDate, findNextAvailableSlot } from '../services/slotService';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors';
import { logAudit } from '../services/auditService';
import { emitToRoom } from '../sockets/socketServer';

export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { doctorId, appointmentDate, appointmentTime, notes, patientId, clinicId } = req.body;

    const targetPatientId =
      actor.role === 'patient' ? actor._id : patientId || actor._id;

    const doctor = await User.findById(doctorId).select('name email role').lean();
    if (!doctor || doctor.role !== 'doctor') {
      throw new NotFoundError('Selected physician does not exist.');
    }

    try {
      const appointment = await Appointment.create({
        patientId: new mongoose.Types.ObjectId(targetPatientId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
        clinicId: clinicId ? new mongoose.Types.ObjectId(clinicId) : undefined,
        appointmentDate,
        appointmentTime,
        notes: notes ? notes.trim() : '',
        status: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            changedBy: new mongoose.Types.ObjectId(actor._id),
            timestamp: new Date(),
            notes: 'Appointment booked.',
          },
        ],
      });

      emitToRoom(`doctor:${doctorId}`, 'appointment:created', {
        appointment,
        message: `New appointment requested for ${appointmentDate} at ${appointmentTime}.`,
      });

      await logAudit(
        'APPOINTMENT_CREATED',
        'Appointment',
        actor._id,
        actor.role,
        appointment._id.toString(),
        { doctorId, appointmentDate, appointmentTime }
      );

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully.',
        appointment,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Double booking race conflict
        const suggestedSlot = await findNextAvailableSlot(doctorId, appointmentDate, appointmentTime);
        throw new ConflictError(
          'The selected time slot has just been reserved by another patient.',
          suggestedSlot
        );
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

export const getAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { status, date, doctorId, patientId, page = 1, limit = 20 } = req.query;

    const query: any = {};

    // Role-based visibility isolation
    if (actor.role === 'patient') {
      query.patientId = actor._id;
    } else if (actor.role === 'doctor') {
      query.doctorId = actor._id;
    } else if (actor.role === 'receptionist' && actor.clinicId) {
      query.clinicId = actor.clinicId;
    }

    if (status && typeof status === 'string') {
      query.status = status.toUpperCase();
    }
    if (date && typeof date === 'string') {
      query.appointmentDate = date;
    }
    if (doctorId && typeof doctorId === 'string' && actor.role !== 'doctor') {
      query.doctorId = doctorId;
    }
    if (patientId && typeof patientId === 'string' && actor.role !== 'patient') {
      query.patientId = patientId;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('patientId', 'name email phone')
        .populate('doctorId', 'name email')
        .populate('clinicId', 'name address')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      appointments,
    });
  } catch (err) {
    next(err);
  }
};

export const getAppointmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email')
      .populate('clinicId', 'name address phone')
      .lean();

    if (!appointment) {
      throw new NotFoundError('Appointment record not found.');
    }

    const isPatientOwner = (appointment.patientId as any)?._id?.toString() === actor._id;
    const isDoctorAssigned = (appointment.doctorId as any)?._id?.toString() === actor._id;
    const isStaff = ['receptionist', 'admin'].includes(actor.role);

    if (!isPatientOwner && !isDoctorAssigned && !isStaff) {
      throw new ForbiddenError('You are not authorized to view this appointment.');
    }

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  REJECTED: [],
  CANCELLED: [],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
};

export const updateAppointmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;
    const { status, notes, cancellationReason } = req.body;

    const targetStatus = (status as string)?.toUpperCase() as AppointmentStatus;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new NotFoundError('Appointment not found.');
    }

    const isPatientOwner = appointment.patientId.toString() === actor._id;
    const isDoctorAssigned = appointment.doctorId.toString() === actor._id;
    const isStaff = ['receptionist', 'admin'].includes(actor.role);

    if (targetStatus === 'CANCELLED') {
      if (!isPatientOwner && !isDoctorAssigned && !isStaff) {
        throw new ForbiddenError('You are not authorized to cancel this appointment.');
      }
    } else {
      if (!isDoctorAssigned && !isStaff) {
        throw new ForbiddenError('Only attending physicians or staff can update this appointment status.');
      }
    }

    const allowedNextStates = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowedNextStates.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${appointment.status} to ${targetStatus}.`
      );
    }

    appointment.status = targetStatus;
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }

    appointment.statusHistory.push({
      status: targetStatus,
      changedBy: new mongoose.Types.ObjectId(actor._id),
      timestamp: new Date(),
      notes: notes || `Status updated to ${targetStatus} by ${actor.role}.`,
    });

    await appointment.save();

    emitToRoom(`user:${appointment.patientId}`, 'appointment:status_changed', {
      appointmentId: appointment._id,
      status: targetStatus,
      message: `Your appointment status is now ${targetStatus}.`,
    });

    emitToRoom(`doctor:${appointment.doctorId}`, 'appointment:status_changed', {
      appointmentId: appointment._id,
      status: targetStatus,
    });

    await logAudit(
      'APPOINTMENT_STATUS_UPDATED',
      'Appointment',
      actor._id,
      actor.role,
      appointment._id.toString(),
      { from: appointment.status, to: targetStatus }
    );

    res.status(200).json({
      success: true,
      message: `Appointment updated to ${targetStatus}.`,
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || typeof doctorId !== 'string') {
      throw new ValidationError('Doctor ID is required.');
    }
    if (!date || typeof date !== 'string') {
      throw new ValidationError('Date (YYYY-MM-DD) is required.');
    }

    const slotData = await getDoctorSlotsForDate(doctorId, date);

    res.status(200).json({
      success: true,
      ...slotData,
    });
  } catch (err) {
    next(err);
  }
};
