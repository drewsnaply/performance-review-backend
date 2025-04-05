const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
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
const PORT = process.env.PORT || 5000;

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://performance-review-frontend.onrender.com',
];

// Comprehensive CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps or Postman) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'Accept',
    'x-client-key',
    'x-client-token',
    'x-client-secret',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    timestamp: new Date().toISOString(),
  });
  next();
});

// JSON parsing middleware
app.use(express.json({ limit: '10kb' }));

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connection Successful', new Date().toISOString());
  } catch (error) {
    console.error('MongoDB Connection Failed:', {
      message: error.message,
      timestamp: new Date().toISOString(),
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
  res.status(200).json({
    message: 'Performance Review System Backend',
    timestamp: new Date().toISOString(),
  });
});

// CORS test route
app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(globalErrorHandler);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('Server Running:', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
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