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

const { authRoutes } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', 
      'https://performance-review-frontend.onrender.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Apply CORS middleware early
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// JSON parsing middleware
app.use(express.json());

// Comprehensive logging middleware
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    headers: req.headers,
    body: req.body
  });
  next();
});

// Morgan logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes with additional logging
app.use('/api/auth', (req, res, next) => {
  console.log('AUTH ROUTE - Request Details:', {
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: req.headers,
    origin: req.get('origin')
  });
  next();
}, authRoutes);

app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Performance Review System Backend');
});

// Additional error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`Server started on port ${PORT}`);
  });
};

startServer();

module.exports = app;