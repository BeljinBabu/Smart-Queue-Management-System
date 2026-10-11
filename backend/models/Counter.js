const mongoose = require('mongoose');

// One counter per service + date. Used to issue unique, sequential token numbers atomically.
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

counterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
