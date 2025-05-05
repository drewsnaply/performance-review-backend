// scripts/createEmployee.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createEmployee() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if Employee already exists
    const existingEmployee = await User.findOne({ 
      role: 'employee',
      username: 'employee'
    });
    
    if (existingEmployee) {
      console.log('Employee already exists:', existingEmployee.username);
    } else {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Employee123!', salt);
      
      // Create Employee user
      const employee = new User({
        username: 'employee',
        email: 'employee@example.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'Employee',
        role: 'employee',
        department: 'Operations',
        position: 'Team Member',
        jobTitle: 'Team Member',
        employmentType: 'Full-Time',
        hireDate: new Date().toISOString().split('T')[0],
        dateOfBirth: '1990-01-01', // Sample birth date
        gender: 'Prefer Not To Say',
        contactNumber: '555-123-4567',
        requirePasswordChange: false,
        isActive: true
      });
      
      await employee.save();
      console.log('Employee created successfully!');
      console.log('Username: employee');
      console.log('Password: Employee123!');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error creating Employee:', error);
  }
}

// Run the function
createEmployee();