// migrate.js
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function migrateJobTitles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database');

    // Load the Employee model
    const Employee = require('./models/Employee');
    
    console.log('Starting job title migration...');
    const employees = await Employee.find({});
    console.log(`Found ${employees.length} employees to process`);
    
    let updateCount = 0;
    
    // Process each employee
    for (const employee of employees) {
      try {
        // Get job title from any available field
        const jobTitle = employee.position || employee.jobTitle || employee.title || '';
        
        // Skip if no job title
        if (!jobTitle) {
          console.log(`Skipping employee ${employee._id}: No job title found`);
          continue;
        }
        
        // Update using direct assignment (avoiding getter/setter recursion)
        const updates = {};
        if (employee.position !== jobTitle) updates.position = jobTitle;
        if (employee.jobTitle !== jobTitle) updates.jobTitle = jobTitle;
        if (employee.title !== jobTitle) updates.title = jobTitle;
        
        // Only update if changes are needed
        if (Object.keys(updates).length > 0) {
          console.log(`Updating employee: ${employee.firstName} ${employee.lastName}`);
          console.log(`  Setting all job title fields to: "${jobTitle}"`);
          
          // Use updateOne to bypass middleware and getters/setters
          await Employee.updateOne(
            { _id: employee._id },
            { $set: updates }
          );
          
          updateCount++;
        } else {
          console.log(`Skipping employee ${employee._id}: Job titles already consistent`);
        }
      } catch (err) {
        console.error(`Error processing employee ${employee._id}:`, err);
      }
    }
    
    console.log(`Migration complete. Updated ${updateCount} employee records.`);
    
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateJobTitles();