const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPasswords() {
  try {
    // Try to get MongoDB URI from environment variables
    let uri = process.env.MONGODB_URI;
    
    // If not found, use hardcoded URI
    if (!uri) {
      console.log('MONGODB_URI not found in environment, using hardcoded connection string');
      // Replace with your MongoDB URI (use the URI that worked in your create-users.js script)
      uri = 'mongodb+srv://amintzell:YourPassword@prod-performance-cluste.yx3j8vu.mongodb.net/test?retryWrites=true&w=majority';
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to database');
    
    // Import User model after connection
    const User = require('./models/User');
    
    // Find the users
    const admin = await User.findOne({ username: 'admin' });
    const manager = await User.findOne({ username: 'manager1' });
    
    console.log('Found users:');
    console.log('- Admin:', !!admin);
    console.log('- Manager:', !!manager);
    
    // Reset admin password (directly set the hash)
    if (admin) {
      // Create a secure hash for "Admin123!"
      const adminPassword = await bcrypt.hash('Admin123!', 10);
      
      // The critical part - directly update the user document without triggering the pre-save hook
      await User.updateOne(
        { _id: admin._id }, 
        { $set: { password: adminPassword } }
      );
      console.log('Admin password reset successfully');
    }
    
    // Reset manager password (directly set the hash)
    if (manager) {
      // Create a secure hash for "Manager123!"
      const managerPassword = await bcrypt.hash('Manager123!', 10);
      
      // Directly update the user document without triggering the pre-save hook
      await User.updateOne(
        { _id: manager._id }, 
        { $set: { password: managerPassword } }
      );
      console.log('Manager password reset successfully');
    }
    
    console.log('Password reset complete!');
  } catch (error) {
    console.error('Error resetting passwords:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

resetPasswords();