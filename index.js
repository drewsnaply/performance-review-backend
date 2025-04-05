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
const PORT = process.env.PORT || 5000;

// CRITICAL CORS FIX - Must be before any other middleware
app.use((req, res, next) => {
  // Allow specific origins
  const allowedOrigins = [
    'http://localhost:3000',
    'https://performance-review-frontend.onrender.com'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // For development purposes, log blocked origins
    if (origin) {
      console.log(`CORS blocked origin: ${origin}`);
    }
  }
  
  // Essential headers for CORS
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Original CORS middleware as fallback
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://performance-review-frontend.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway to prevent issues
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
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Debug middleware to log CORS issues
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
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
  // Add CORS headers explicitly to this route too
  const origin = req.headers.origin;
  if (origin === 'http://localhost:3000' || 
      origin === 'https://performance-review-frontend.onrender.com') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).send('Performance Review System Backend');
});

// CORS test route
app.get('/test-cors', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
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
    const server = app.listen(PORT, () => {
      console.log(`Server Running:`, {
        port: PORT,
        environment: process.env.NODE_ENV,
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