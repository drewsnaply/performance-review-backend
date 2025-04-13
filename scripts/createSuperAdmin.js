// scripts/createSuperAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Your User model

async function createSuperAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if Super Admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperAdmin) {
      console.log('Super Admin already exists:', existingSuperAdmin.username);
    } else {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', salt); // Secure password
      
      // Create Super Admin user
      const superAdmin = new User({
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin', // Using lowercase to match the enum in User schema
        department: 'Administration',
        position: 'Super Administrator',
        requirePasswordChange: false
      });
      
      await superAdmin.save();
      console.log('Super Admin created successfully!');
      console.log('Username: superadmin');
      console.log('Password: SuperAdmin123!');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error creating Super Admin:', error);
  }
}

// Run the function
createSuperAdmin();