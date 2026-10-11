const express = require('express');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');
const { toMin } = require('../utils/dates');

const router = express.Router();
router.use(protect);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validate(body) {
  const { name, code, startTime = '09:00', endTime = '17:00', slotMinutes = 15 } = body;
  if (!name || !code) throw httpError(400, 'Service name and token code are required');
  if (!TIME.test(startTime) || !TIME.test(endTime)) throw httpError(400, 'Times must be in HH:mm format');
  if (toMin(endTime) <= toMin(startTime)) throw httpError(400, 'End time must be after start time');
  if (Number(slotMinutes) < 5) throw httpError(400, 'Slot duration must be at least 5 minutes');
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    res.json(await Service.find(filter).sort({ department: 1, name: 1 }));
  })
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    validate(req.body);
    res.status(201).json(await Service.create(req.body));
  })
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    validate(req.body);
    const svc = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!svc) throw httpError(404, 'Service not found');
    res.json(svc);
  })
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const inUse = await Appointment.exists({ service: req.params.id, status: { $in: ['BOOKED', 'CALLED'] } });
    if (inUse) throw httpError(400, 'Service has pending appointments. Deactivate it instead of deleting.');
    const svc = await Service.findByIdAndDelete(req.params.id);
    if (!svc) throw httpError(404, 'Service not found');
    res.json({ message: 'Service deleted' });
  })
);

module.exports = router;
