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

// FIXED: Changed to use the new export method from auth.js
const { router: authRoutes } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Comprehensive CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://performance-review-frontend.onrender.com',
    'https://performance-review-frontend.onrender.com/', // Include with trailing slash
    'https://performance-review-backend.onrender.com',
    'https://performance-review-backend.onrender.com/' // Include with trailing slash
  ],
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
  preflightContinue: false
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add explicit options handling for CORS preflight requests
app.options('*', cors(corsOptions));

// Detailed logging middleware
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  });
  
  // Manual CORS headers for additional flexibility
  res.header('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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
    console.log('MongoDB Connection:', {
      status: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MongoDB Connection Error:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Routes with logging
app.use('/api/auth', (req, res, next) => {
  console.log('AUTH Route Request:', {
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
}, authRoutes);

app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Performance Review System Backend');
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server Running:`, {
      port: PORT,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
};

startServer();

module.exports = app;