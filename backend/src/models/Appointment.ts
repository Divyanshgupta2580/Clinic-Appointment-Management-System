import mongoose, { Document, Schema } from 'mongoose';

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

export interface IStatusHistory {
  status: AppointmentStatus;
  changedBy: mongoose.Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  appointmentDate: string; // Format: YYYY-MM-DD
  appointmentTime: string; // Format: HH:MM
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    appointmentDate: {
      type: String,
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time is required'],
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'],
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'REJECTED',
        'CANCELLED',
        'CHECKED_IN',
        'IN_PROGRESS',
        'COMPLETED',
        'NO_SHOW',
        'RESCHEDULED',
      ],
      default: 'PENDING',
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ATOMIC DATABASE DOUBLE-BOOKING CONSTRAINT
 * A compound unique index prevents race-condition double-booking.
 * Active consultation slots ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED')
 * are strictly unique.
 * Inactive slots ('REJECTED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') are recycled.
 */
appointmentSchema.index(
  {
    doctorId: 1,
    appointmentDate: 1,
    appointmentTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'],
      },
    },
  }
);

appointmentSchema.index({ patientId: 1, appointmentDate: -1, createdAt: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
