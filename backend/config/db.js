const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/anraone_attendance';

  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 15000,
  };

  try {
    mongoose.connection.on('connected', () => {
      console.log('📡  Mongoose default connection open to database');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌  Mongoose default connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌  Mongoose default connection disconnected');
    });

    const conn = await mongoose.connect(uri, options);
    console.log(`\n✅  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂  Database: ${conn.connection.name}\n`);
  } catch (error) {
    console.error(`\n❌  MongoDB Connection Failed: ${error.message}`);
    console.error('    Please ensure MongoDB is running or verify your MONGODB_URI in .env\n');
    process.exit(1);
  }
};

module.exports = { connectDB };

