const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let memoryServerInstance = null;

async function autoSeedIfEmpty() {
  try {
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found. Auto-seeding initial demo data...');
      const seedData = require('../seed');
      await seedData();
    }
  } catch (err) {
    console.warn('Auto-seed check skipped:', err.message);
  }
}

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_appointment';
  mongoose.set('strictQuery', true);

  // Try connecting to configured MongoDB (e.g. system service or Atlas)
  try {
    const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isLocal ? 2000 : 10000
    });
    console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    await autoSeedIfEmpty();
    return;
  } catch (err) {
    const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');
    if (!isLocal) {
      console.error(`Failed to connect to MongoDB at ${uri}:`, err.message);
      throw err;
    }

    console.log(`Local MongoDB not detected on default port (${err.message}). Starting embedded MongoDB...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const dbPath = path.join(__dirname, '..', '.db_data');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }

      // Try standard port 27017 so Compass and default tools can connect
      try {
        memoryServerInstance = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbPath,
            dbName: 'smart_appointment'
          }
        });
      } catch (portErr) {
        // Fallback to any free port if 27017 is occupied
        memoryServerInstance = await MongoMemoryServer.create({
          instance: {
            dbPath,
            dbName: 'smart_appointment'
          }
        });
      }

      const embeddedUri = memoryServerInstance.getUri('smart_appointment');
      await mongoose.connect(embeddedUri);
      console.log(`Embedded MongoDB connected: ${embeddedUri}`);
      await autoSeedIfEmpty();
    } catch (embeddedErr) {
      console.error('Failed to start embedded MongoDB server:', embeddedErr.message);
      throw embeddedErr;
    }
  }
};

process.on('SIGINT', async () => {
  if (memoryServerInstance) {
    try {
      await memoryServerInstance.stop();
    } catch (_) {}
  }
  process.exit(0);
});
