const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
  AppError,
  catchAsync,
  globalErrorHandler,
  unhandledRouteHandler,
  logger,
} = require('./errorHandler');

// Import routes with destructuring
const { router: authRoutes } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid port conflicts

// Comprehensive CORS Configuration
const corsOptions = {
  origin: function(origin, callback) {
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'https://performance-review-frontend.onrender.com',
      'http://127.0.0.1:3000'
    ];

    // Allow requests with no origin or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Origin', 
    'X-Requested-With', 
    'Accept'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });
  next();
});

// JSON parsing middleware
app.use(express.json());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('MongoDB Connection Successful', new Date().toISOString());
  } catch (error) {
    console.error('MongoDB Connection Failed:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Performance Review System Backend');
});

// CORS test route
app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.headers.origin || 'unknown'
  });
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server Running:`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    server.on('error', (error) => {
      console.error('Server Startup Error:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;