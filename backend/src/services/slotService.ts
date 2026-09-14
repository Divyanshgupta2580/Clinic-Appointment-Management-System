import mongoose from 'mongoose';
import { DoctorProfile } from '../models/DoctorProfile';
import { Appointment } from '../models/Appointment';
import { Availability } from '../models/Availability';
import {
  generateSlots,
  getDayOfWeek,
  timeToMinutes,
  formatDateStr,
} from '../utils/timeUtils';

export interface DoctorSlotData {
  allSlots: string[];
  availableSlots: string[];
  occupiedSlots: string[];
  isAvailableDay: boolean;
  consultationDuration: number;
}

export const getDoctorSlotsForDate = async (
  doctorId: string | mongoose.Types.ObjectId,
  dateStr: string
): Promise<DoctorSlotData> => {
  const profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  if (!profile) {
    return {
      allSlots: [],
      availableSlots: [],
      occupiedSlots: [],
      isAvailableDay: false,
      consultationDuration: 30,
    };
  }

  // Check specific date availability override
  const override = await Availability.findOne({ doctorId, date: dateStr }).lean();
  if (override && !override.isAvailable) {
    return {
      allSlots: [],
      availableSlots: [],
      occupiedSlots: [],
      isAvailableDay: false,
      consultationDuration: profile.consultationDuration || 30,
    };
  }

  const dayName = getDayOfWeek(dateStr);
  const isRegularAvailableDay = !profile.availableDays || profile.availableDays.includes(dayName);

  if (!isRegularAvailableDay && !override?.isAvailable) {
    return {
      allSlots: [],
      availableSlots: [],
      occupiedSlots: [],
      isAvailableDay: false,
      consultationDuration: profile.consultationDuration || 30,
    };
  }

  const duration = profile.consultationDuration || 30;
  const startTime = override?.customStartTime || profile.availableStartTime || '09:00';
  const endTime = override?.customEndTime || profile.availableEndTime || '17:00';

  const allSlots = generateSlots(startTime, endTime, duration);

  // Fetch all active appointments on that date
  const bookedAppointments = await Appointment.find({
    doctorId,
    appointmentDate: dateStr,
    status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
  })
    .select('appointmentTime')
    .lean();

  const occupiedSlots = bookedAppointments.map((a) => a.appointmentTime);
  const availableSlots = allSlots.filter((slot) => !occupiedSlots.includes(slot));

  return {
    allSlots,
    availableSlots,
    occupiedSlots,
    isAvailableDay: true,
    consultationDuration: duration,
  };
};

export const findNextAvailableSlot = async (
  doctorId: string | mongoose.Types.ObjectId,
  requestedDate: string,
  requestedTime: string
): Promise<{ date: string; time: string; doctorId: string } | null> => {
  try {
    const currentDayData = await getDoctorSlotsForDate(doctorId, requestedDate);
    const requestedMins = timeToMinutes(requestedTime);

    // Look for a later slot on the same day
    const laterSlotToday = currentDayData.availableSlots.find(
      (slot) => timeToMinutes(slot) > requestedMins
    );

    if (laterSlotToday) {
      return {
        date: requestedDate,
        time: laterSlotToday,
        doctorId: doctorId.toString(),
      };
    }

    // Scan up to 7 subsequent days
    const [year, month, day] = requestedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    for (let i = 1; i <= 7; i++) {
      dateObj.setUTCDate(dateObj.getUTCDate() + 1);
      const nextDateStr = formatDateStr(dateObj);

      const nextDayData = await getDoctorSlotsForDate(doctorId, nextDateStr);
      if (nextDayData.isAvailableDay && nextDayData.availableSlots.length > 0) {
        return {
          date: nextDateStr,
          time: nextDayData.availableSlots[0],
          doctorId: doctorId.toString(),
        };
      }
    }

    return null;
  } catch (err: any) {
    console.error('[SlotService] Error computing next available slot:', err.message);
    return null;
  }
};
