import { Request, Response, NextFunction } from 'express';
import {
  checkInAppointment,
  createWalkInEntry,
  callNextPatient,
  startConsultation,
  completeConsultation,
  markNoShow,
  getPatientLiveStatus,
  getDoctorDailyQueue,
  QUEUE_DISCLAIMER,
} from '../services/queueService';
import { QueueEntry } from '../models/QueueEntry';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { logAudit } from '../services/auditService';
import { emitToRoom } from '../sockets/socketServer';

export const checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.user!;
    const { appointmentId } = req.body;

    if (!appointmentId) {
      throw new ValidationError('Appointment ID is required to check in.');
    }

    const queueEntry = await checkInAppointment(appointmentId, actor._id, actor.role);

    await logAudit(
      'PATIENT_CHECKED_IN',
      'QueueEntry',
      actor._id,
      actor.role,
      queueEntry._id.toString(),
      { queueNumber: queueEntry.queueNumber }
    );

    res.status(200).json({
      success: true,
      message: `Checked in successfully! Your queue number is #${queueEntry.queueNumber}.`,
      queueEntry,
      disclaimer: QUEUE_DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
};

export const createWalkIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { doctorId, patientName, clinicId, priority, notes } = req.body;

    if (!doctorId) {
      throw new ValidationError('Doctor ID is required.');
    }
    if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
      throw new ValidationError('Patient name is required (min 2 characters).');
    }

    const queueEntry = await createWalkInEntry(
      doctorId,
      patientName,
      actor._id,
      clinicId || actor.clinicId,
      priority ? Number(priority) : 1,
      notes
    );

    await logAudit(
      'WALKIN_CREATED',
      'QueueEntry',
      actor._id,
      actor.role,
      queueEntry._id.toString(),
      { doctorId, patientName }
    );

    res.status(201).json({
      success: true,
      message: `Walk-in patient registered. Queue number is #${queueEntry.queueNumber}.`,
      queueEntry,
      disclaimer: QUEUE_DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
};

export const getTodayQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { doctorId, date } = req.query;

    const targetDoctorId =
      actor.role === 'doctor' ? actor._id : (doctorId as string);

    if (!targetDoctorId) {
      throw new ValidationError('Doctor ID is required to fetch queue.');
    }

    const data = await getDoctorDailyQueue(targetDoctorId, date as string);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyQueueStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { date } = req.query;

    const status = await getPatientLiveStatus(actor._id, date as string);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (err) {
    next(err);
  }
};

export const callNext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.user!;
    const { doctorId, date } = req.body;

    const targetDoctorId = actor.role === 'doctor' ? actor._id : doctorId;
    if (!targetDoctorId) {
      throw new ValidationError('Doctor ID is required.');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const calledPatient = await callNextPatient(targetDoctorId, targetDate);

    if (!calledPatient) {
      res.status(200).json({
        success: true,
        message: 'No patients waiting in queue.',
        calledPatient: null,
      });
      return;
    }

    await logAudit(
      'PATIENT_CALLED',
      'QueueEntry',
      actor._id,
      actor.role,
      calledPatient._id.toString(),
      { queueNumber: calledPatient.queueNumber }
    );

    res.status(200).json({
      success: true,
      message: `Called Queue #${calledPatient.queueNumber} (${calledPatient.patientName}).`,
      calledPatient,
    });
  } catch (err) {
    next(err);
  }
};

export const startVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    const targetDoctorId = actor.role === 'doctor' ? actor._id : req.body.doctorId;

    const entry = await startConsultation(id, targetDoctorId);

    res.status(200).json({
      success: true,
      message: `Consultation started for Queue #${entry.queueNumber}.`,
      queueEntry: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const completeVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    const targetDoctorId = actor.role === 'doctor' ? actor._id : req.body.doctorId;

    const entry = await completeConsultation(id, targetDoctorId);

    res.status(200).json({
      success: true,
      message: `Consultation completed for Queue #${entry.queueNumber}.`,
      queueEntry: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const markPatientNoShow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    const entry = await markNoShow(id, actor._id, actor.role);

    res.status(200).json({
      success: true,
      message: `Marked Queue #${entry.queueNumber} as no-show.`,
      queueEntry: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const setDoctorDelayNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { doctorId, date, delayNotice } = req.body;

    const targetDoctorId = actor.role === 'doctor' ? actor._id : doctorId;

    await QueueEntry.updateMany(
      { doctorId: targetDoctorId, date, status: 'WAITING' },
      { delayNotice: delayNotice || '' }
    );

    emitToRoom(`doctor:${targetDoctorId}`, 'queue:delay_updated', {
      doctorId: targetDoctorId,
      delayNotice,
    });

    res.status(200).json({
      success: true,
      message: 'Queue delay status updated.',
      delayNotice,
    });
  } catch (err) {
    next(err);
  }
};
