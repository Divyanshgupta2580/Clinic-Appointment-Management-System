import mongoose, { Document, Schema } from 'mongoose';

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface IQueueEntry extends Document {
  clinicId?: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  patientName: string;
  queueNumber: number;
  date: string; // Format: YYYY-MM-DD
  status: QueueStatus;
  checkedInAt: Date;
  calledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedWaitMinutes: number;
  isWalkIn: boolean;
  priority: number; // 1 = Standard, 2 = Urgent
  delayNotice?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const queueEntrySchema = new Schema<IQueueEntry>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    queueNumber: {
      type: Number,
      required: [true, 'Queue number is required'],
    },
    date: {
      type: String,
      required: [true, 'Queue date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    status: {
      type: String,
      enum: ['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
      default: 'WAITING',
      required: true,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    calledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isWalkIn: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 1, // 1: standard, 2: urgent
    },
    delayNotice: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast query resolution
queueEntrySchema.index({ doctorId: 1, date: 1, status: 1 });
queueEntrySchema.index({ doctorId: 1, date: 1, queueNumber: 1 });
queueEntrySchema.index({ clinicId: 1, date: 1, status: 1 });

export const QueueEntry = mongoose.model<IQueueEntry>('QueueEntry', queueEntrySchema);
