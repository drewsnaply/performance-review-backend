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
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // If not in allowed origins, default to the frontend URL
      callback(null, 'https://performance-review-frontend.onrender.com');
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Handle OPTIONS requests explicitly
app.options('*', cors());

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));

// Logging middleware
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/employees', employeesRoutes);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Performance Review System Backend',
    timestamp: new Date().toISOString(),
  });
});

// CORS Test Route
app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.get('origin') || 'unknown',
    headers: req.headers,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use(globalErrorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Connect to MongoDB and start the server
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
    // Check if user already exists
    const exists = await User.findOne({ username: 'manager1' });
    if (!exists) {
      console.log('Creating default admin user...');
      const newUser = new User({
        username: 'manager1', 
        email: 'manager1@example.com',
        password: 'password123', // This will be hashed by the model
        role: 'manager',
        isActive: true
      });
      await newUser.save();
      console.log('✅ Default admin user created');
    } else {
      console.log('✅ Default admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default user:', error);
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

  // Graceful shutdown handling
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