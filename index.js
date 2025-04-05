const express = require('express');
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

// Define allowed origins (both localhost and production)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://performance-review-frontend.onrender.com',
];

/**
 * Custom CORS middleware that:
 * - Checks if the incoming Origin header is in our allowedOrigins array.
 * - Sets the Access-Control-Allow-* headers accordingly.
 * - Handles preflight OPTIONS requests.
 */
app.use((req, res, next) => {
  const requestOrigin = req.get('origin');
  if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
    // Set the origin to the request origin if allowed (or if no origin provided)
    res.header('Access-Control-Allow-Origin', requestOrigin || 'https://performance-review-frontend.onrender.com');
  } else {
    // For unrecognized origins, you can either block or fallback to a specific domain
    res.header('Access-Control-Allow-Origin', 'https://performance-review-frontend.onrender.com');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // If this is a preflight OPTIONS request, respond immediately.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ JSON Parsing Middleware
app.use(express.json({ limit: '10kb' }));

// ✅ Logging middleware to log each incoming request
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    timestamp: new Date().toISOString(),
  });
  next();
});

// ✅ Request Logging using Morgan
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// ✅ Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connection Successful', new Date().toISOString());
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
};

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// ✅ Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Performance Review System Backend',
    timestamp: new Date().toISOString(),
  });
});

// ✅ CORS Test Route
app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ✅ Global Error Handler
app.use(globalErrorHandler);

// ✅ 404 Handler for Undefined Routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Start Server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Server Running:', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });

    // Graceful Shutdown Handling
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
  } catch (error) {
    console.error('❌ Failed to Start Server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;