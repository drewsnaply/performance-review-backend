const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// If MONGODB_URI is still undefined, set a default
if (!process.env.MONGODB_URI) {
  console.warn("MONGODB_URI not found in environment, using hardcoded connection string");
  process.env.MONGODB_URI = 'mongodb+srv://amintzell:IloveTJbear@prod-performance-cluste.yx3j8vu.mongodb.net/test?retryWrites=true&w=majority';
}

console.log("MONGODB_URI is defined:", !!process.env.MONGODB_URI);

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const { AppError, catchAsync, globalErrorHandler, logger } = require('./errorHandler');
const { router: authRoutes } = require('./routes/auth');
const departmentsRoutes = require('./routes/departments');
const employeesRoutes = require('./routes/employees');

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://performance-review-frontend.onrender.com'
];

// Configure and use the cors package
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS attempt from unauthorized origin: ${origin}`);
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

app.options('*', cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigins.includes(req.headers.origin) ? req.headers.origin : 'https://performance-review-frontend.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json({ limit: '10kb' }));

app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/employees', employeesRoutes);

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Performance Review System Backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.get('origin') || 'unknown',
    headers: req.headers,
    timestamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connection Successful', new Date().toISOString());
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// Create default admin user function
const createDefaultAdmin = async () => {
  try {
    const User = require('./models/User');
    
    // Log all existing users
    const allUsers = await User.find({});
    console.log('All existing users:', allUsers.map(u => ({
      username: u.username,
      email: u.email,
      role: u.role
    })));
    
    const userCount = await User.countDocuments();
    console.log(`Total user count: ${userCount}`);
    
    const managerUsername = 'manager1';
    const adminUsername = 'admin';

    // Check if manager user exists
    const managerUser = await User.findOne({ username: managerUsername });

    if (!managerUser) {
      console.log(`Manager user "${managerUsername}" not found. Creating...`);
      const newManagerUser = new User({
        username: managerUsername, 
        email: 'manager1@example.com',
        password: 'Manager123!', // Strong, unique password
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        department: 'Management',
        isActive: true,
        requirePasswordChange: true
      });
      await newManagerUser.save();
      console.log('✅ Default manager user created');
    } else {
      console.log(`✅ Manager user "${managerUsername}" already exists`);
    }

    // Check if admin user exists
    const adminUser = await User.findOne({ username: adminUsername });

    if (!adminUser) {
      console.log(`Admin user "${adminUsername}" not found. Creating...`);
      const newAdminUser = new User({
        username: adminUsername, 
        email: 'admin@example.com',
        password: 'Admin123!', // Strong, unique password
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'Administration',
        isActive: true,
        requirePasswordChange: true
      });
      await newAdminUser.save();
      console.log('✅ Default admin user created');
    } else {
      console.log(`✅ Admin user "${adminUsername}" already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
};

const startServer = async () => {
  await connectDB();
  
  // Create default admin user
  await createDefaultAdmin();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Server Running:', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Process terminated');
      process.exit(0);
    });
  });

  server.on('error', (error) => {
    console.error('❌ Server Startup Error:', error);
  });
};

startServer();

module.exports = app;