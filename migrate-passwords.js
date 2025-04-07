const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./models/Employee'); // Adjust path as needed

async function migratePaswords() {
  try {
    // Connect to your database
    await mongoose.connect(process.env.MONGO_URI);

    // Find all users with unhashed passwords
    const users = await Employee.find().select('+password');

    for (let user of users) {
      // Only hash if password is not already hashed
      if (user.password && !user.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        console.log(`Migrated password for user: ${user.username}`);
      }
    }

    console.log('Password migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePaswords();