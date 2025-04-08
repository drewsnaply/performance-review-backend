const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createUsers() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('MONGODB_URI is not defined in environment variables');
      // Provide a hardcoded URI as fallback (use your own connection string)
      const hardcodedUri = 'mongodb+srv://amintzell:IloveTJbear@prod-performance-cluste.yx3j8vu.mongodb.net/test?retryWrites=true&w=majority';
      console.log('Using hardcoded MongoDB URI instead');
      await mongoose.connect(hardcodedUri);
    } else {
      console.log('Using MongoDB URI from environment variables');
      await mongoose.connect(uri);
    }
    
    console.log('Connected to database');
    
    // Import User model after connection
    const User = require('./models/User');
    
    // Check if users already exist
    const adminExists = await User.findOne({ username: 'admin' });
    const managerExists = await User.findOne({ username: 'manager1' });
    
    console.log('Admin exists:', !!adminExists);
    console.log('Manager exists:', !!managerExists);
    
    // Delete existing users with these usernames
    await User.deleteMany({ username: { $in: ['admin', 'manager1'] } });
    console.log('Deleted existing admin/manager users');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      department: 'Administration',
      isActive: true,
      requirePasswordChange: false
    });
    
    await admin.save();
    console.log('Admin user created');
    
    // Create manager user
    const managerPassword = await bcrypt.hash('Manager123!', 10);
    const manager = new User({
      username: 'manager1',
      email: 'manager1@example.com',
      password: managerPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      department: 'Management',
      isActive: true,
      requirePasswordChange: false
    });
    
    await manager.save();
    console.log('Manager user created');
    
    // Verify users exist
    const users = await User.find({ username: { $in: ['admin', 'manager1'] } });
    console.log('Created users:', users.map(u => ({ username: u.username, role: u.role })));
    
    console.log('Users created successfully');
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

createUsers();