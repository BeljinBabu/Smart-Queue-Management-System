// Usage: npm run seed            -> adds demo accounts, services and a few demo appointments (if none exist)
//        npm run seed -- --reset -> wipes all collections first
require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Service = require('./models/Service');
const Appointment = require('./models/Appointment');
const Counter = require('./models/Counter');
const { todayStr } = require('./utils/dates');

async function seedData(options = {}) {
  const reset = options.reset || process.argv.includes('--reset');
  if (reset) {
    await Promise.all([User.deleteMany({}), Service.deleteMany({}), Appointment.deleteMany({}), Counter.deleteMany({})]);
    await Appointment.syncIndexes();
    console.log('All collections cleared');
  }

  const users = [
    { name: 'Admin', email: 'admin@smartappointment.com', password: 'Admin@123', role: 'admin', phone: '9000000000' },
    { name: 'Demo User', email: 'user@smartappointment.com', password: 'User@123', role: 'user', phone: '9000000001' },
    { name: 'Arun Kumar', email: 'arun@example.com', password: 'User@123', role: 'user', phone: '9000000002' },
    { name: 'Priya S', email: 'priya@example.com', password: 'User@123', role: 'user', phone: '9000000003' },
    { name: 'Karthik R', email: 'karthik@example.com', password: 'User@123', role: 'user', phone: '9000000004' }
  ];
  const saved = {};
  for (const u of users) {
    let doc = await User.findOne({ email: u.email });
    if (!doc) doc = await User.create({ ...u, password: await bcrypt.hash(u.password, 10) });
    saved[u.email] = doc;
  }

  const services = [
    { name: 'General Consultation', code: 'GEN', department: 'Healthcare', description: 'Meet a general physician', startTime: '09:00', endTime: '13:00', slotMinutes: 15 },
    { name: 'Dental Checkup', code: 'DEN', department: 'Healthcare', description: 'Routine dental examination', startTime: '10:00', endTime: '16:00', slotMinutes: 30 },
    { name: 'Document Verification', code: 'DOC', department: 'Government Services', description: 'Verification of certificates and IDs', startTime: '09:30', endTime: '15:30', slotMinutes: 20 },
    { name: 'Account Services', code: 'ACC', department: 'Banking', description: 'New account, KYC update and passbook', startTime: '10:00', endTime: '15:00', slotMinutes: 15, workingDays: [1, 2, 3, 4, 5] }
  ];
  const svc = {};
  for (const s of services) {
    let doc = await Service.findOne({ code: s.code });
    if (!doc) doc = await Service.create(s);
    svc[s.code] = doc;
  }

  if ((await Appointment.countDocuments()) === 0) {
    const date = todayStr();
    const demo = [
      ['arun@example.com', '09:00', 'COMPLETED'],
      ['priya@example.com', '09:15', 'CALLED'],
      ['karthik@example.com', '09:30', 'BOOKED'],
      ['user@smartappointment.com', '09:45', 'BOOKED']
    ];
    for (const [email, slot, status] of demo) {
      const n = await Counter.next(`${svc.GEN._id}:${date}`);
      const now = new Date();
      await Appointment.create({
        user: saved[email]._id, service: svc.GEN._id, date, slot, status,
        tokenNumber: n, tokenCode: `GEN-${String(n).padStart(3, '0')}`,
        calledAt: status === 'BOOKED' ? null : now,
        completedAt: status === 'COMPLETED' ? now : null
      });
    }
    console.log('Demo appointments created for today');
  }

  console.log('\nSeed complete.\n  Admin : admin@smartappointment.com / Admin@123\n  User  : user@smartappointment.com  / User@123');
}

module.exports = seedData;

if (require.main === module) {
  const connectDB = require('./config/db');
  (async () => {
    await connectDB();
    await seedData();
    process.exit(0);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
