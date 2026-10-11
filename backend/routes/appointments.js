const express = require('express');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Counter = require('../models/Counter');
const { protect } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');
const { isValidDate, todayStr, addDays } = require('../utils/dates');
const { slotsForDate, MAX_DAYS_AHEAD } = require('../utils/slots');

const router = express.Router();
router.use(protect);

const tokenCode = (service, n) => `${service.code}-${String(n).padStart(3, '0')}`;

async function getService(id) {
  const svc = id ? await Service.findById(id).catch(() => null) : null;
  if (!svc) throw httpError(404, 'Service not found');
  return svc;
}

function checkDateAndSlot(service, date, slot) {
  if (!isValidDate(date)) throw httpError(400, 'Invalid date');
  const today = todayStr();
  if (date < today) throw httpError(400, 'You cannot book a past date');
  if (date > addDays(today, MAX_DAYS_AHEAD)) throw httpError(400, `Bookings open only ${MAX_DAYS_AHEAD} days in advance`);
  const { closed, slots } = slotsForDate(service, date);
  if (closed) throw httpError(400, 'This service is closed on the selected day');
  const found = slots.find((s) => s.time === slot);
  if (!found) throw httpError(400, 'Invalid time slot');
  if (found.reason === 'past') throw httpError(400, 'That time slot has already passed');
}

async function getOwned(id, user) {
  const appt = await Appointment.findById(id).populate('service').populate('user', 'name email phone');
  if (!appt) throw httpError(404, 'Appointment not found');
  if (user.role !== 'admin' && String(appt.user._id) !== String(user._id)) throw httpError(403, 'Not your appointment');
  return appt;
}

// ---- available slots for a service on a date -------------------------------------------
router.get(
  '/slots',
  asyncHandler(async (req, res) => {
    const { serviceId, date } = req.query;
    if (!isValidDate(date)) throw httpError(400, 'Invalid date');
    const service = await getService(serviceId);
    const taken = new Set(await Appointment.find({ service: service._id, date, active: true }).distinct('slot'));
    const result = slotsForDate(service, date, taken);
    res.json({ date, serviceId: service._id, ...result });
  })
);

// ---- book ------------------------------------------------------------------------------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { serviceId, date, slot, notes } = req.body;
    const service = await getService(serviceId);
    if (!service.isActive) throw httpError(400, 'This service is currently unavailable');
    checkDateAndSlot(service, date, slot);

    const dup = await Appointment.exists({
      user: req.user._id, service: service._id, date, status: { $in: ['BOOKED', 'CALLED'] }
    });
    if (dup) throw httpError(409, 'You already have an appointment for this service on that date');
    if (await Appointment.exists({ service: service._id, date, slot, active: true })) {
      throw httpError(409, 'That slot has just been booked. Please pick another slot.');
    }

    const tokenNumber = await Counter.next(`${service._id}:${date}`);
    const appt = await Appointment.create({
      user: req.user._id, service: service._id, date, slot, notes,
      tokenNumber, tokenCode: tokenCode(service, tokenNumber)
    });
    res.status(201).json(await appt.populate('service'));
  })
);

// ---- my appointments -------------------------------------------------------------------
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const list = await Appointment.find({ user: req.user._id })
      .populate('service')
      .sort({ date: -1, slot: -1 });
    res.json(list);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => res.json(await getOwned(req.params.id, req.user)))
);

// ---- live queue status for one appointment ---------------------------------------------
router.get(
  '/:id/queue',
  asyncHandler(async (req, res) => {
    const appt = await getOwned(req.params.id, req.user);
    const base = { service: appt.service._id, date: appt.date };

    const serving = await Appointment.findOne({ ...base, status: 'CALLED' });
    const lastDone = await Appointment.findOne({ ...base, status: 'COMPLETED' }).sort({ completedAt: -1 });
    const waitingTotal = await Appointment.countDocuments({ ...base, status: 'BOOKED' });

    let ahead = 0;
    if (appt.status === 'BOOKED') {
      ahead = await Appointment.countDocuments({
        ...base, status: 'BOOKED',
        $or: [{ slot: { $lt: appt.slot } }, { slot: appt.slot, tokenNumber: { $lt: appt.tokenNumber } }]
      });
    }
    const servingOther = serving && String(serving._id) !== String(appt._id);
    res.json({
      appointment: appt,
      nowServing: serving ? serving.tokenCode : null,
      lastCompleted: lastDone ? lastDone.tokenCode : null,
      waitingTotal,
      ahead,
      estimatedWaitMins: appt.status === 'BOOKED' ? (ahead + (servingOther ? 1 : 0)) * appt.service.slotMinutes : 0,
      serverTime: new Date().toISOString()
    });
  })
);

// ---- cancel ----------------------------------------------------------------------------
router.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const appt = await getOwned(req.params.id, req.user);
    if (appt.status !== 'BOOKED') throw httpError(400, `A ${appt.status.toLowerCase()} appointment cannot be cancelled`);
    appt.status = 'CANCELLED';
    appt.active = false;
    await appt.save();
    res.json(appt);
  })
);

// ---- reschedule ------------------------------------------------------------------------
router.patch(
  '/:id/reschedule',
  asyncHandler(async (req, res) => {
    const { date, slot } = req.body;
    const appt = await getOwned(req.params.id, req.user);
    if (appt.status !== 'BOOKED') throw httpError(400, 'Only booked appointments can be rescheduled');
    const service = appt.service;
    if (!service.isActive) throw httpError(400, 'This service is currently unavailable');
    checkDateAndSlot(service, date, slot);
    if (date === appt.date && slot === appt.slot) throw httpError(400, 'Please choose a different slot');

    const clash = await Appointment.exists({ service: service._id, date, slot, active: true, _id: { $ne: appt._id } });
    if (clash) throw httpError(409, 'That slot has just been booked. Please pick another slot.');
    if (date !== appt.date) {
      const dup = await Appointment.exists({
        user: appt.user._id, service: service._id, date, status: { $in: ['BOOKED', 'CALLED'] }
      });
      if (dup) throw httpError(409, 'You already have an appointment for this service on that date');
      appt.tokenNumber = await Counter.next(`${service._id}:${date}`); // new day -> new token
      appt.tokenCode = tokenCode(service, appt.tokenNumber);
    }
    appt.date = date;
    appt.slot = slot;
    await appt.save();
    res.json(appt);
  })
);

module.exports = router;
