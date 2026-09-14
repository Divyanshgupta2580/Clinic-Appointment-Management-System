import mongoose, { Document, Schema } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  address: string;
  phone: string;
  email?: string;
  operatingHours: {
    openTime: string;
    closeTime: string;
    operatingDays: string[];
  };
  settings: {
    defaultConsultationMinutes: number;
    bufferMinutes: number;
    allowWalkIns: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const clinicSchema = new Schema<IClinic>(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Clinic address is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Clinic contact phone is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    operatingHours: {
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' },
      operatingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
    },
    settings: {
      defaultConsultationMinutes: { type: Number, default: 30 },
      bufferMinutes: { type: Number, default: 5 },
      allowWalkIns: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Clinic = mongoose.model<IClinic>('Clinic', clinicSchema);
