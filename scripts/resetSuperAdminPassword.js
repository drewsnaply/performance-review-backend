// scripts/resetSuperAdminPassword.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs'); // Make sure to use bcryptjs

async function resetSuperAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Update the password directly using MongoDB update
    const result = await mongoose.connection.db.collection('users').updateOne(
      { username: 'superadmin' },
      { 
        $set: { 
          // Generate a new hash with bcryptjs
          password: await bcryptjs.hash('SuperAdmin123!', 10),
          requirePasswordChange: false
        } 
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log('Superadmin password reset successfully');
      console.log('Username: superadmin');
      console.log('New password: SuperAdmin123!');
    } else {
      console.log('No document was modified. User might not exist or already has this password.');
    }
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error resetting superadmin password:', error);
  }
}

resetSuperAdminPassword();