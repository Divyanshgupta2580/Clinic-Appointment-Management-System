const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor userId reference is required'],
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required (e.g. MBBS, MD)'],
      trim: true,
      maxlength: [100, 'Qualification cannot exceed 100 characters'],
    },
    experience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Experience cannot be negative'],
    },
    consultationDuration: {
      type: Number,
      default: 30, // in minutes
      min: [10, 'Consultation duration must be at least 10 minutes'],
      max: [120, 'Consultation duration cannot exceed 120 minutes'],
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      validate: {
        validator: function (days) {
          const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          return days && days.length > 0 && days.every((d) => validDays.includes(d));
        },
        message: 'Must provide at least one valid day of the week',
      },
    },
    availableStartTime: {
      type: String,
      default: '09:00',
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM 24-hour format'],
    },
    availableEndTime: {
      type: String,
      default: '17:00',
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM 24-hour format'],
    },
  },
  {
    timestamps: true,
  }
);

// Optimize search by specialization
doctorProfileSchema.index({ specialization: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
