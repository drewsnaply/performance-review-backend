const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cors = require('cors');
const { catchAsync, AppError } = require('../errorHandler');
const router = express.Router();

// Set up CORS middleware
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'https://performance-review-frontend.onrender.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware globally for this router
router.use(cors(corsOptions));

// Generate JWT Token
const generateToken = (user) => {
  try {
    return jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  } catch (error) {
    console.error('Token Generation Error:', error);
    return null;
  }
};

// Register new user
router.post('/register', catchAsync(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400));
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return next(new AppError('User with this email or username already exists', 400));
  }

  const newUser = new User({ username, email, password, role: role || 'employee' });
  const savedUser = await newUser.save();

  const token = generateToken(savedUser);
  if (!token) {
    return next(new AppError('Failed to generate authentication token', 500));
  }

  const userResponse = savedUser.toObject();
  delete userResponse.password;

  res.status(201).json({ token, user: userResponse });
}));

// Login user
router.post('/login', catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError('Please provide both username and password', 400));
  }

  const user = await User.findOne({ username }).select('+password');
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  const token = generateToken(user);
  if (!token) {
    return next(new AppError('Failed to generate token', 500));
  }

  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json({ token, user: userResponse });
}));

// Middleware to protect routes
const protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  req.user = currentUser;
  next();
});

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Get current user profile
router.get('/me', protect, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.json(user);
}));

// Export router and middleware
module.exports = {
  router,
  protect,
  authorize, // Ensure authorize is correctly exported
};