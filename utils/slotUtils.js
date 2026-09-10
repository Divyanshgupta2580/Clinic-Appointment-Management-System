const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

/**
 * Converts "HH:MM" string to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes from midnight to "HH:MM" 24h format
 */
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Generates an array of time slot strings ["09:00", "09:30", ...]
 */
const generateSlots = (startTime = '09:00', endTime = '17:00', duration = 30) => {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const slots = [];

  for (let current = startMins; current + duration <= endMins; current += duration) {
    slots.push(minutesToTime(current));
  }

  return slots;
};

/**
 * Gets day of week name for a YYYY-MM-DD string
 */
const getDayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Using UTC Date constructor to prevent timezone shift
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
};

/**
 * Formats a Date object to YYYY-MM-DD string in UTC
 */
const formatDateStr = (date) => {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Retrieves all slots, occupied slots, and available slots for a doctor on a specific date
 */
const getDoctorSlotsForDate = async (doctorId, dateStr) => {
  const profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  if (!profile) {
    return { allSlots: [], availableSlots: [], occupiedSlots: [], isAvailableDay: false };
  }

  const dayName = getDayOfWeek(dateStr);
  const isAvailableDay = !profile.availableDays || profile.availableDays.includes(dayName);

  if (!isAvailableDay) {
    return { allSlots: [], availableSlots: [], occupiedSlots: [], isAvailableDay: false };
  }

  const duration = profile.consultationDuration || 30;
  const startTime = profile.availableStartTime || '09:00';
  const endTime = profile.availableEndTime || '17:00';

  const allSlots = generateSlots(startTime, endTime, duration);

  // Fetch all active appointments on that date
  const bookedAppointments = await Appointment.find({
    doctorId,
    appointmentDate: dateStr,
    status: { $in: ['pending', 'accepted', 'completed'] },
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
    profile,
  };
};

/**
 * Finds the next available slot when a conflict occurs
 * 1. Checks later slots on the same date
 * 2. If none, checks up to 7 subsequent days
 */
const findNextAvailableSlot = async (doctorId, requestedDate, requestedTime) => {
  try {
    // 1. Check same day for a slot strictly after requestedTime
    const currentDayData = await getDoctorSlotsForDate(doctorId, requestedDate);
    const requestedMins = timeToMinutes(requestedTime);

    const laterSlotToday = currentDayData.availableSlots.find(
      (slot) => timeToMinutes(slot) > requestedMins
    );

    if (laterSlotToday) {
      return {
        date: requestedDate,
        time: laterSlotToday,
        doctorId,
      };
    }

    // 2. Scan up to next 7 days
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
          doctorId,
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[SlotUtils] Error finding next available slot:', err.message);
    return null;
  }
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  generateSlots,
  getDayOfWeek,
  getDoctorSlotsForDate,
  findNextAvailableSlot,
};
