require('dotenv').config();
const mongoose = require('mongoose');

// Try to connect with .env variable
async function testConnection() {
  try {
    console.log('Testing connection...');

    let uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log('No MONGODB_URI found in environment');
      return;
    }
    
    console.log('Attempting to connect with URI from environment...');
    // Hide password in logs
    const redactedUri = uri.replace(/:([^@]+)@/, ':***@');
    console.log('URI (redacted):', redactedUri);

    try {
      await mongoose.connect(uri);
      console.log('✅ CONNECTION SUCCESSFUL!');
      
      // List all collections to verify connection
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Collections in database:', collections.map(c => c.name).join(', '));
      
      await mongoose.disconnect();
      console.log('Disconnected gracefully');
    } catch (err) {
      console.error('❌ CONNECTION FAILED:', err.message);
    }

    // Now try with explicit authentication
    console.log('\n---\nTrying to connect with explicit credentials...');
    
    // Use these credentials or the ones you know are working
    const username = 'amintzell';
    const password = 'YourPasswordHere'; // Replace with your actual password
    const cluster = 'prod-performance-cluste.yx3j8vu.mongodb.net';
    const dbName = 'test';
    
    const explicitUri = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;
    console.log(`Explicit connection using username: ${username}`);
    
    try {
      await mongoose.connect(explicitUri);
      console.log('✅ EXPLICIT CONNECTION SUCCESSFUL!');
      
      // List all collections to verify connection
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Collections in database:', collections.map(c => c.name).join(', '));
      
      await mongoose.disconnect();
      console.log('Disconnected gracefully');
    } catch (err) {
      console.error('❌ EXPLICIT CONNECTION FAILED:', err.message);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();