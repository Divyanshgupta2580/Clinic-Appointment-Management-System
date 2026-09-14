import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  specialization: string;
  qualification: string;
  experience: number;
  consultationDuration: number;
  availableDays: string[];
  availableStartTime: string;
  availableEndTime: string;
  clinicId?: mongoose.Types.ObjectId;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor userId reference is required'],
      unique: true,
      index: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      index: true,
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Experience years is required'],
      min: [0, 'Experience cannot be negative'],
    },
    consultationDuration: {
      type: Number,
      default: 30,
      min: [10, 'Duration must be at least 10 minutes'],
      max: [120, 'Duration cannot exceed 120 minutes'],
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      validate: {
        validator: (days: string[]) =>
          days &&
          days.length > 0 &&
          days.every((d) =>
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(d)
          ),
        message: 'Must provide at least one valid day of the week',
      },
    },
    availableStartTime: {
      type: String,
      default: '09:00',
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be HH:MM'],
    },
    availableEndTime: {
      type: String,
      default: '17:00',
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be HH:MM'],
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorProfile = mongoose.model<IDoctorProfile>('DoctorProfile', doctorProfileSchema);
