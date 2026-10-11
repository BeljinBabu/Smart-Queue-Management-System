const express = require('express');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');
const { isValidDate, todayStr, addDays } = require('../utils/dates');

const router = express.Router();
router.use(protect, adminOnly);

const populate = (q) => q.populate('user', 'name email phone').populate('service', 'name code slotMinutes');

// ---- appointments of a day (queue view) ------------------------------------------------
router.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const date = req.query.date || todayStr();
    if (!isValidDate(date)) throw httpError(400, 'Invalid date');
    const filter = { date };
    if (req.query.serviceId) filter.service = req.query.serviceId;
    if (req.query.status) filter.status = req.query.status;
    res.json(await populate(Appointment.find(filter).sort({ slot: 1, tokenNumber: 1 })));
  })
);

// ---- call next token -------------------------------------------------------------------
router.patch(
  '/queue/call-next',
  asyncHandler(async (req, res) => {
    const { serviceId } = req.body;
    const date = req.body.date || todayStr();
    if (!serviceId) throw httpError(400, 'serviceId is required');
    if (!isValidDate(date)) throw httpError(400, 'Invalid date');

    // finish the token currently being served
    await Appointment.updateMany(
      { service: serviceId, date, status: 'CALLED' },
      { status: 'COMPLETED', completedAt: new Date() }
    );
    const next = await Appointment.findOneAndUpdate(
      { service: serviceId, date, status: 'BOOKED' },
      { status: 'CALLED', calledAt: new Date() },
      { new: true, sort: { slot: 1, tokenNumber: 1 } }
    );
    if (!next) return res.json({ message: 'No more appointments waiting', called: null });
    res.json({ message: `Now serving ${next.tokenCode}`, called: await populate(Appointment.findById(next._id)) });
  })
);

// ---- change status of one appointment --------------------------------------------------
const ALLOWED = ['BOOKED', 'CALLED', 'COMPLETED', 'SKIPPED', 'CANCELLED'];

router.patch(
  '/appointments/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!ALLOWED.includes(status)) throw httpError(400, 'Invalid status');
    const appt = await Appointment.findById(req.params.id);
    if (!appt) throw httpError(404, 'Appointment not found');
    if (['CANCELLED', 'COMPLETED'].includes(appt.status)) throw httpError(400, `A ${appt.status.toLowerCase()} appointment cannot be changed`);

    if (status === 'CALLED') {
      await Appointment.updateMany(
        { service: appt.service, date: appt.date, status: 'CALLED', _id: { $ne: appt._id } },
        { status: 'COMPLETED', completedAt: new Date() }
      );
      appt.calledAt = new Date();
    }
    if (status === 'COMPLETED') {
      if (!appt.calledAt) appt.calledAt = new Date();
      appt.completedAt = new Date();
    }
    appt.status = status;
    appt.active = status !== 'CANCELLED';
    await appt.save();
    res.json(await populate(Appointment.findById(appt._id)));
  })
);

// ---- dashboard statistics --------------------------------------------------------------
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const today = todayStr();
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));

    const [users, activeServices, statusAgg, todayAgg, serviceAgg, dayAgg, avgAgg] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Service.countDocuments({ isActive: true }),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([{ $match: { date: today } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'svc' } },
        { $unwind: '$svc' },
        { $project: { _id: 0, name: '$svc.name', code: '$svc.code', count: 1 } },
        { $sort: { count: -1 } }
      ]),
      Appointment.aggregate([
        { $match: { date: { $in: days }, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: '$date', count: { $sum: 1 } } }
      ]),
      Appointment.aggregate([
        { $match: { status: 'COMPLETED', calledAt: { $ne: null }, completedAt: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: { $divide: [{ $subtract: ['$completedAt', '$calledAt'] }, 60000] } } } }
      ])
    ]);

    const toMap = (agg) => agg.reduce((m, r) => ({ ...m, [r._id]: r.count }), {});
    const byStatus = toMap(statusAgg);
    const todayByStatus = toMap(todayAgg);
    const dayMap = toMap(dayAgg);

    res.json({
      users,
      activeServices,
      totalAppointments: statusAgg.reduce((s, r) => s + r.count, 0),
      byStatus,
      today: {
        total: todayAgg.reduce((s, r) => s + r.count, 0),
        waiting: todayByStatus.BOOKED || 0,
        serving: todayByStatus.CALLED || 0,
        completed: todayByStatus.COMPLETED || 0,
        cancelled: todayByStatus.CANCELLED || 0
      },
      byService: serviceAgg,
      last7Days: days.map((d) => ({ date: d, count: dayMap[d] || 0 })),
      avgServiceMinutes: avgAgg.length ? Math.round(avgAgg[0].avg * 10) / 10 : 0
    });
  })
);

module.exports = router;
