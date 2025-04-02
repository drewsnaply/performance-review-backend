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
  logger 
} = require('./errorHandler');

const { authRoutes } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Updated CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://performance-review-frontend.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
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

// Routes
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Performance Review System Backend');
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../performance-review-system-new/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../performance-review-system-new', 'build', 'index.html'));
  });
}

// Unhandled routes
app.use(unhandledRouteHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = app;