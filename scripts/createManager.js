// scripts/createManager.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createManager() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if Manager already exists
    const existingManager = await User.findOne({ 
      role: 'manager',
      username: 'manager'
    });
    
    if (existingManager) {
      console.log('Manager already exists:', existingManager.username);
    } else {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Manager123!', salt);
      
      // Create Manager user
      const manager = new User({
        username: 'manager',
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'Team',
        lastName: 'Manager',
        role: 'manager',
        department: 'Operations',
        position: 'Department Manager',
        jobTitle: 'Department Manager',
        employmentType: 'Full-Time',
        hireDate: new Date().toISOString().split('T')[0],
        requirePasswordChange: false,
        isActive: true
      });
      
      await manager.save();
      console.log('Manager created successfully!');
      console.log('Username: manager');
      console.log('Password: Manager123!');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error creating Manager:', error);
  }
}

// Run the function
createManager();