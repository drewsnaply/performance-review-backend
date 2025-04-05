const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
require('dotenv').config();

const { AppError, catchAsync, globalErrorHandler, logger } = require('./errorHandler');
const { router: authRoutes } = require('./routes/auth');
const departmentsRoutes = require('./routes/departments');
const employeesRoutes = require('./routes/employees');

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins (adjust if needed)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://performance-review-frontend.onrender.com'
];

/**
 * Global CORS middleware.
 *
 * - Checks if the incoming request's origin is allowed and sets it,
 *   falling back to your production URL if the origin does not match.
 * - Handles preflight OPTIONS requests immediately.
 */
app.use((req, res, next) => {
  const origin = req.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : 'https://performance-review-frontend.onrender.com';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Immediately respond to OPTIONS (preflight) requests.
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));

// Logging middleware (using morgan and your custom logger)
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

// CORS Test Route (to verify headers in production)
app.get('/test-cors', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.get('origin') || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Global Error Handler.
 *
 * This error handler adds the same CORS headers to error responses,
 * ensuring your frontend will always get the required header.
 */
app.use((err, req, res, next) => {
  const origin = req.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : 'https://performance-review-frontend.onrender.com';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  return globalErrorHandler(err, req, res, next);
});

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

const startServer = async () => {
  await connectDB();
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