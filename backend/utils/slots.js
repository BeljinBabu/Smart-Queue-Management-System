const { toMin, fromMin, todayStr, nowMinutes, weekday } = require('./dates');

const MAX_DAYS_AHEAD = 30;

/** All slot start times (HH:mm) a service offers in one working day. */
function generateSlots(service) {
  const start = toMin(service.startTime);
  const end = toMin(service.endTime);
  const step = service.slotMinutes;
  const slots = [];
  for (let t = start; t + step <= end; t += step) slots.push(fromMin(t));
  return slots;
}

/** Slots for a date with availability flags. `taken` is a Set of already-booked HH:mm values. */
function slotsForDate(service, date, taken = new Set()) {
  if (!service.workingDays.includes(weekday(date))) return { closed: true, slots: [] };
  const isToday = date === todayStr();
  const now = nowMinutes();
  const slots = generateSlots(service).map((time) => {
    const past = isToday && toMin(time) <= now;
    const booked = taken.has(time);
    return { time, available: !past && !booked, reason: past ? 'past' : booked ? 'booked' : null };
  });
  return { closed: false, slots };
}

module.exports = { generateSlots, slotsForDate, MAX_DAYS_AHEAD };
