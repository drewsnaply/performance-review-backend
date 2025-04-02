const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// MongoDB Connection function
const connectDB = async () => {
  // Direct MongoDB connection string
  const mongoUri = 'mongodb://localhost:27017/performanceReviewSystem';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;