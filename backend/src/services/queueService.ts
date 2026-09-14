import mongoose from 'mongoose';
import { QueueEntry, IQueueEntry, QueueStatus } from '../models/QueueEntry';
import { Appointment } from '../models/Appointment';
import { DoctorProfile } from '../models/DoctorProfile';
import { User } from '../models/User';
import { AppError, NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { getTodayStr, getLocalDateStr } from '../utils/timeUtils';
import { emitToRoom } from '../sockets/socketServer';

export const QUEUE_DISCLAIMER =
  'Estimated waiting time is an approximation based on current clinic flow and may vary based on clinical necessity. This does not constitute medical advice.';

export interface PatientQueueStatus {
  hasActiveQueueEntry: boolean;
  queueEntry?: IQueueEntry;
  queueNumber?: number;
  patientsAhead?: number;
  estimatedWaitMinutes?: number;
  currentStatus?: QueueStatus;
  doctorName?: string;
  isDoctorDelayed?: boolean;
  delayNotice?: string;
  disclaimer: string;
}

/**
 * Calculates current queue position (patients ahead) for a given entry
 */
export const calculatePatientsAhead = async (
  doctorId: string | mongoose.Types.ObjectId,
  date: string,
  queueNumber: number
): Promise<number> => {
  return QueueEntry.countDocuments({
    doctorId,
    date,
    status: { $in: ['WAITING', 'CALLED'] },
    queueNumber: { $lt: queueNumber },
  });
};

/**
 * Generates the next sequential queue number for a doctor on a given date
 */
export const getNextQueueNumber = async (
  doctorId: string | mongoose.Types.ObjectId,
  date: string
): Promise<number> => {
  const lastEntry = await QueueEntry.findOne({ doctorId, date })
    .sort({ queueNumber: -1 })
    .select('queueNumber')
    .lean();

  return lastEntry ? lastEntry.queueNumber + 1 : 1;
};

/**
 * Check in an appointment (Patient or Receptionist action)
 */
export const checkInAppointment = async (
  appointmentId: string,
  actorId: string,
  actorRole: string
): Promise<IQueueEntry> => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');

  if (!appointment) {
    throw new NotFoundError('Appointment not found.');
  }

  // Authorization check
  const isPatientOwner = appointment.patientId._id.toString() === actorId;
  const isStaff = ['doctor', 'receptionist', 'admin'].includes(actorRole);

  if (!isPatientOwner && !isStaff) {
    throw new ForbiddenError('You are not authorized to check in for this appointment.');
  }

  // State validation: Only CONFIRMED appointments can be checked in
  if (appointment.status !== 'CONFIRMED') {
    throw new ValidationError(
      `Only confirmed appointments can be checked in. Current status: ${appointment.status}`
    );
  }

  const todayStr = getTodayStr();
  const localDateStr = getLocalDateStr();
  const isToday =
    appointment.appointmentDate === todayStr ||
    appointment.appointmentDate === localDateStr;

  if (!isToday && !isStaff) {
    throw new ValidationError('You can only check in on the day of your appointment.');
  }

  // Check if already in queue
  const existingQueue = await QueueEntry.findOne({
    appointmentId: appointment._id,
    status: { $in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
  });

  if (existingQueue) {
    return existingQueue;
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: appointment.doctorId._id }).lean();
  const duration = doctorProfile?.consultationDuration || 30;

  const queueNumber = await getNextQueueNumber(appointment.doctorId._id, appointment.appointmentDate);
  const patientsAhead = await calculatePatientsAhead(
    appointment.doctorId._id,
    appointment.appointmentDate,
    queueNumber
  );

  const estimatedWaitMinutes = patientsAhead * duration;

  // Create queue entry
  const queueEntry = await QueueEntry.create({
    clinicId: appointment.clinicId,
    doctorId: appointment.doctorId._id,
    appointmentId: appointment._id,
    patientId: appointment.patientId._id,
    patientName: (appointment.patientId as any).name || 'Patient',
    queueNumber,
    date: appointment.appointmentDate,
    status: 'WAITING',
    checkedInAt: new Date(),
    estimatedWaitMinutes,
    isWalkIn: false,
    priority: 1,
  });

  // Update appointment status to CHECKED_IN
  appointment.status = 'CHECKED_IN';
  appointment.statusHistory.push({
    status: 'CHECKED_IN',
    changedBy: new mongoose.Types.ObjectId(actorId),
    timestamp: new Date(),
    notes: `Checked in. Assigned Queue #${queueNumber}.`,
  });
  await appointment.save();

  // Broadcast real-time notifications
  emitToRoom(`doctor:${appointment.doctorId._id}`, 'queue:patient_checked_in', {
    queueEntry,
    appointmentId: appointment._id,
    message: `${queueEntry.patientName} has checked in (Queue #${queueNumber}).`,
  });

  if (appointment.clinicId) {
    emitToRoom(`clinic:${appointment.clinicId}`, 'queue:updated', {
      doctorId: appointment.doctorId._id,
      date: appointment.appointmentDate,
    });
  }

  emitToRoom(`user:${appointment.patientId._id}`, 'queue:status_changed', {
    status: 'WAITING',
    queueNumber,
    patientsAhead,
    estimatedWaitMinutes,
  });

  return queueEntry;
};

/**
 * Register a walk-in patient directly into the queue (Receptionist action)
 */
export const createWalkInEntry = async (
  doctorId: string,
  patientName: string,
  actorId: string,
  clinicId?: string,
  priority: number = 1,
  notes: string = ''
): Promise<IQueueEntry> => {
  const doctorUser = await User.findById(doctorId).select('name role').lean();
  if (!doctorUser || doctorUser.role !== 'doctor') {
    throw new NotFoundError('Doctor not found.');
  }

  const todayStr = getTodayStr();
  const doctorProfile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  const duration = doctorProfile?.consultationDuration || 30;

  const queueNumber = await getNextQueueNumber(doctorId, todayStr);
  const patientsAhead = await calculatePatientsAhead(doctorId, todayStr, queueNumber);
  const estimatedWaitMinutes = patientsAhead * duration;

  const queueEntry = await QueueEntry.create({
    clinicId: clinicId ? new mongoose.Types.ObjectId(clinicId) : undefined,
    doctorId: new mongoose.Types.ObjectId(doctorId),
    patientName: patientName.trim(),
    queueNumber,
    date: todayStr,
    status: 'WAITING',
    checkedInAt: new Date(),
    estimatedWaitMinutes,
    isWalkIn: true,
    priority,
    notes,
  });

  emitToRoom(`doctor:${doctorId}`, 'queue:patient_checked_in', {
    queueEntry,
    message: `Walk-in patient ${patientName} added (Queue #${queueNumber}).`,
  });

  if (clinicId) {
    emitToRoom(`clinic:${clinicId}`, 'queue:updated', { doctorId, date: todayStr });
  }

  return queueEntry;
};

/**
 * Call the next patient in line (Doctor action)
 */
export const callNextPatient = async (doctorId: string, date: string): Promise<IQueueEntry | null> => {
  const nextPatient = await QueueEntry.findOne({
    doctorId,
    date,
    status: 'WAITING',
  }).sort({ priority: -1, queueNumber: 1 });

  if (!nextPatient) {
    return null;
  }

  nextPatient.status = 'CALLED';
  nextPatient.calledAt = new Date();
  await nextPatient.save();

  // Notify patient room if registered user
  if (nextPatient.patientId) {
    emitToRoom(`user:${nextPatient.patientId}`, 'queue:patient_called', {
      queueNumber: nextPatient.queueNumber,
      message: 'It is your turn! Please proceed to the doctor consultation room.',
    });
  }

  emitToRoom(`doctor:${doctorId}`, 'queue:updated', { doctorId, date });
  return nextPatient;
};

/**
 * Start consultation for a patient (Doctor action)
 */
export const startConsultation = async (
  queueEntryId: string,
  doctorId: string
): Promise<IQueueEntry> => {
  const entry = await QueueEntry.findById(queueEntryId);
  if (!entry) {
    throw new NotFoundError('Queue entry not found.');
  }

  if (entry.doctorId.toString() !== doctorId) {
    throw new ForbiddenError('You can only manage your own queue.');
  }

  entry.status = 'IN_CONSULTATION';
  entry.startedAt = new Date();
  await entry.save();

  if (entry.appointmentId) {
    await Appointment.findByIdAndUpdate(entry.appointmentId, {
      status: 'IN_PROGRESS',
      $push: {
        statusHistory: {
          status: 'IN_PROGRESS',
          changedBy: new mongoose.Types.ObjectId(doctorId),
          timestamp: new Date(),
          notes: 'Consultation started by doctor.',
        },
      },
    });
  }

  // Recalculate estimated wait times for all subsequent patients
  await recalculateQueueWaitTimes(doctorId, entry.date);

  emitToRoom(`doctor:${doctorId}`, 'queue:updated', { doctorId, date: entry.date });
  if (entry.patientId) {
    emitToRoom(`user:${entry.patientId}`, 'queue:status_changed', {
      status: 'IN_CONSULTATION',
      queueNumber: entry.queueNumber,
    });
  }

  return entry;
};

/**
 * Mark consultation as completed (Doctor action)
 */
export const completeConsultation = async (
  queueEntryId: string,
  doctorId: string
): Promise<IQueueEntry> => {
  const entry = await QueueEntry.findById(queueEntryId);
  if (!entry) {
    throw new NotFoundError('Queue entry not found.');
  }

  if (entry.doctorId.toString() !== doctorId) {
    throw new ForbiddenError('You can only manage your own queue.');
  }

  entry.status = 'COMPLETED';
  entry.completedAt = new Date();
  await entry.save();

  if (entry.appointmentId) {
    await Appointment.findByIdAndUpdate(entry.appointmentId, {
      status: 'COMPLETED',
      $push: {
        statusHistory: {
          status: 'COMPLETED',
          changedBy: new mongoose.Types.ObjectId(doctorId),
          timestamp: new Date(),
          notes: 'Consultation completed.',
        },
      },
    });
  }

  await recalculateQueueWaitTimes(doctorId, entry.date);

  emitToRoom(`doctor:${doctorId}`, 'queue:updated', { doctorId, date: entry.date });
  if (entry.patientId) {
    emitToRoom(`user:${entry.patientId}`, 'queue:status_changed', {
      status: 'COMPLETED',
      queueNumber: entry.queueNumber,
    });
  }

  return entry;
};

/**
 * Mark a patient as no-show
 */
export const markNoShow = async (
  queueEntryId: string,
  actorId: string,
  actorRole: string
): Promise<IQueueEntry> => {
  const entry = await QueueEntry.findById(queueEntryId);
  if (!entry) {
    throw new NotFoundError('Queue entry not found.');
  }

  entry.status = 'NO_SHOW';
  await entry.save();

  if (entry.appointmentId) {
    await Appointment.findByIdAndUpdate(entry.appointmentId, {
      status: 'NO_SHOW',
      $push: {
        statusHistory: {
          status: 'NO_SHOW',
          changedBy: new mongoose.Types.ObjectId(actorId),
          timestamp: new Date(),
          notes: `Marked as no-show by ${actorRole}.`,
        },
      },
    });
  }

  await recalculateQueueWaitTimes(entry.doctorId.toString(), entry.date);

  emitToRoom(`doctor:${entry.doctorId}`, 'queue:updated', {
    doctorId: entry.doctorId,
    date: entry.date,
  });

  return entry;
};

/**
 * Recalculates estimated wait time for all waiting patients of a doctor
 */
export const recalculateQueueWaitTimes = async (doctorId: string, date: string): Promise<void> => {
  const profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  const duration = profile?.consultationDuration || 30;

  const waitingEntries = await QueueEntry.find({
    doctorId,
    date,
    status: 'WAITING',
  }).sort({ priority: -1, queueNumber: 1 });

  for (let i = 0; i < waitingEntries.length; i++) {
    const entry = waitingEntries[i];
    const estimatedWaitMinutes = i * duration;
    if (entry.estimatedWaitMinutes !== estimatedWaitMinutes) {
      entry.estimatedWaitMinutes = estimatedWaitMinutes;
      await entry.save();

      if (entry.patientId) {
        emitToRoom(`user:${entry.patientId}`, 'queue:wait_time_updated', {
          queueNumber: entry.queueNumber,
          patientsAhead: i,
          estimatedWaitMinutes,
        });
      }
    }
  }
};

/**
 * Retrieve patient's live queue status
 */
export const getPatientLiveStatus = async (
  patientId: string,
  dateStr?: string
): Promise<PatientQueueStatus> => {
  const date = dateStr || getTodayStr();

  const activeEntry = await QueueEntry.findOne({
    patientId,
    date,
    status: { $in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
  })
    .populate('doctorId', 'name')
    .lean();

  if (!activeEntry) {
    return {
      hasActiveQueueEntry: false,
      disclaimer: QUEUE_DISCLAIMER,
    };
  }

  const patientsAhead = await calculatePatientsAhead(
    activeEntry.doctorId._id,
    date,
    activeEntry.queueNumber
  );

  return {
    hasActiveQueueEntry: true,
    queueEntry: activeEntry as any,
    queueNumber: activeEntry.queueNumber,
    patientsAhead,
    estimatedWaitMinutes: activeEntry.estimatedWaitMinutes,
    currentStatus: activeEntry.status,
    doctorName: (activeEntry.doctorId as any)?.name || 'Doctor',
    isDoctorDelayed: Boolean(activeEntry.delayNotice),
    delayNotice: activeEntry.delayNotice,
    disclaimer: QUEUE_DISCLAIMER,
  };
};

/**
 * Retrieve today's queue for a doctor
 */
export const getDoctorDailyQueue = async (doctorId: string, dateStr?: string) => {
  const date = dateStr || getTodayStr();

  const [queueEntries, currentConsultation] = await Promise.all([
    QueueEntry.find({ doctorId, date })
      .sort({ priority: -1, queueNumber: 1 })
      .populate('appointmentId', 'appointmentTime notes status')
      .lean(),
    QueueEntry.findOne({ doctorId, date, status: 'IN_CONSULTATION' })
      .populate('appointmentId', 'appointmentTime notes')
      .lean(),
  ]);

  const waitingCount = queueEntries.filter((e) => e.status === 'WAITING').length;
  const completedCount = queueEntries.filter((e) => e.status === 'COMPLETED').length;

  return {
    date,
    totalToday: queueEntries.length,
    waitingCount,
    completedCount,
    currentPatient: currentConsultation,
    queue: queueEntries,
    disclaimer: QUEUE_DISCLAIMER,
  };
};
