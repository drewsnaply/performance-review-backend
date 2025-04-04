const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const jwt = require('jsonwebtoken'); // Add this for token handling
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

// Updated CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://performance-review-frontend.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS early in the middleware chain
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// JSON parsing middleware (IMPORTANT: ensure it is applied before routes)
app.use(express.json());

// Debugging middleware for better visibility
app.use((req, res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  }); // Log request details
  next();
});

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
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Token Validation Endpoint
app.post('/validateToken', (req, res) => {
  console.log('ValidateToken route hit'); // Log that the route was accessed
  console.log('Headers:', req.headers); // Log the request headers
  console.log('Path:', req.path); // Log the request path

  const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    return res.status(200).json({ valid: true }); // Log success
  } catch (err) {
    console.error('Token verification failed:', err.message); // Log error details
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Routes
app.use('/api/departments', require('./routes/departments'));
app.use('/api/employees', require('./routes/employees'));

// Added debugging for authRoutes
app.use('/api/auth', (req, res, next) => {
  console.log('Auth Routes Middleware Triggered');
  next();
}, authRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Performance Review System Backend');
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(
    express.static(path.join(__dirname, '../performance-review-system-new/build'))
  );

  app.get('*', (req, res) => {
    res.sendFile(
      path.resolve(
        __dirname,
        '../performance-review-system-new',
        'build',
        'index.html'
      )
    );
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