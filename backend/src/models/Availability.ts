import mongoose, { Document, Schema } from 'mongoose';

export interface IAvailability extends Document {
  doctorId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  customStartTime?: string;
  customEndTime?: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    customStartTime: {
      type: String,
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM'],
    },
    customEndTime: {
      type: String,
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

availabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);
