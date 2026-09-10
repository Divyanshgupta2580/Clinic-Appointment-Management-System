const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID reference is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID reference is required'],
      index: true,
    },
    appointmentDate: {
      type: String, // Format: YYYY-MM-DD (keeps date timezone-resilient)
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    appointmentTime: {
      type: String, // Format: HH:MM (24-hour clock)
      required: [true, 'Appointment time is required'],
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason or notes cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * CRITICAL DATABASE CONSTRAINT: Prevent Double Booking
 * A compound unique index prevents race-condition double-booking at the database level.
 * Using partialFilterExpression ensures rejected and cancelled slots are freed up
 * so patients can book them again, while active slots ('pending', 'accepted', 'completed')
 * are strictly unique.
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
      status: { $in: ['pending', 'accepted', 'completed'] },
    },
  }
);

// Secondary indexes for optimized queries and pagination
appointmentSchema.index({ patientId: 1, appointmentDate: -1, createdAt: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
