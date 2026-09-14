export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'admin';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
}

export interface WorkingDay {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
}

export interface DoctorProfile {
  _id: string;
  id?: string;
  userId: string | User;
  fullName: string;
  email: string;
  phone?: string;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee: number;
  roomNumber: string;
  bio?: string;
  isActive: boolean;
  workingHours: WorkingDay[];
  slotDurationMinutes: number;
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface Appointment {
  _id: string;
  id?: string;
  patientId: string | User;
  doctorId: string | DoctorProfile;
  clinicId?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  queueNumber?: number;
  checkedInAt?: string;
  consultationStartedAt?: string;
  consultationCompletedAt?: string;
  cancellationReason?: string;
  createdAt?: string;
}

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface QueueEntry {
  _id: string;
  id?: string;
  clinicId: string;
  doctorId: string;
  appointmentId: string;
  patientId: string;
  queueNumber: number;
  status: QueueStatus;
  scheduledTime: string;
  checkInTime: string;
  calledTime?: string;
  startedTime?: string;
  completedTime?: string;
  priority: number;
  estimatedWaitMinutes?: number;
  patientsAhead?: number;
  doctorName?: string;
  patientName?: string;
  roomNumber?: string;
  delayNotice?: string;
}

export interface QueueSummary {
  doctorId: string;
  doctorName: string;
  roomNumber: string;
  totalWaiting: number;
  estimatedWaitPerPatient: number;
  isPaused: boolean;
  currentServing: QueueEntry | null;
  entries: QueueEntry[];
}

export interface AuditLog {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}
