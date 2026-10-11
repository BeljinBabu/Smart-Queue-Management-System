const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 5 }, // token prefix, e.g. GEN
    department: { type: String, trim: true, default: 'General' },
    description: { type: String, trim: true, default: '' },
    startTime: { type: String, default: '09:00' }, // HH:mm
    endTime: { type: String, default: '17:00' },
    slotMinutes: { type: Number, default: 15, min: 5, max: 240 },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0 = Sunday
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
