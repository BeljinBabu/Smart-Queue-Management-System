const mongoose = require('mongoose');

const STATUSES = ['BOOKED', 'CALLED', 'COMPLETED', 'SKIPPED', 'CANCELLED'];

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    slot: { type: String, required: true }, // HH:mm
    tokenNumber: { type: Number, required: true },
    tokenCode: { type: String, required: true }, // e.g. GEN-007
    status: { type: String, enum: STATUSES, default: 'BOOKED' },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    active: { type: Boolean, default: true }, // false once cancelled -> frees the slot
    calledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// A slot can only hold one active appointment -> prevents double booking even under concurrent requests.
appointmentSchema.index(
  { service: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
appointmentSchema.index({ service: 1, date: 1, status: 1 });

appointmentSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Appointment', appointmentSchema);
