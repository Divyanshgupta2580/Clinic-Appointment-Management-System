import { Request, Response, NextFunction } from 'express';
import { Appointment } from '../models/Appointment';
import { QueueEntry } from '../models/QueueEntry';
import { DoctorProfile } from '../models/DoctorProfile';
import { getTodayStr } from '../utils/timeUtils';

export const getDailySchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const { date, doctorId } = req.query;
    const targetDate = (date as string) || getTodayStr();

    const query: any = { appointmentDate: targetDate };
    if (actor.clinicId) {
      query.clinicId = actor.clinicId;
    }
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentTime: 1 })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email')
      .lean();

    const doctors = await DoctorProfile.find(actor.clinicId ? { clinicId: actor.clinicId } : {})
      .populate('userId', 'name email')
      .lean();

    res.status(200).json({
      success: true,
      date: targetDate,
      totalAppointments: appointments.length,
      appointments,
      doctors,
    });
  } catch (err) {
    next(err);
  }
};

export const getClinicStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = req.user!;
    const today = getTodayStr();

    const clinicFilter = actor.clinicId ? { clinicId: actor.clinicId } : {};

    const [totalToday, waitingQueue, inConsultation, completedToday] = await Promise.all([
      Appointment.countDocuments({ ...clinicFilter, appointmentDate: today }),
      QueueEntry.countDocuments({ ...clinicFilter, date: today, status: 'WAITING' }),
      QueueEntry.countDocuments({ ...clinicFilter, date: today, status: 'IN_CONSULTATION' }),
      Appointment.countDocuments({ ...clinicFilter, appointmentDate: today, status: 'COMPLETED' }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalToday,
        waitingQueue,
        inConsultation,
        completedToday,
      },
    });
  } catch (err) {
    next(err);
  }
};
