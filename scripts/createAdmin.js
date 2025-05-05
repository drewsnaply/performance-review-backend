// scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if Admin already exists
    const existingAdmin = await User.findOne({ 
      role: 'admin',
      username: 'admin'
    });
    
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.username);
    } else {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Create Admin user
      const admin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        department: 'Administration',
        position: 'System Administrator',
        requirePasswordChange: false
      });
      
      await admin.save();
      console.log('Admin created successfully!');
      console.log('Username: admin');
      console.log('Password: Admin123!');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error creating Admin:', error);
  }
}

// Run the function
createAdmin();