const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// MongoDB Connection function
const connectDB = async () => {
  const mongoUri = 'mongodb://localhost:27017/performanceReviewSystem';
  
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1); // Exit the process if the database connection fails
  }
};

module.exports = connectDB;