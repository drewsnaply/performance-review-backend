const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { catchAsync, AppError } = require('../errorHandler');

const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Register new user
router.post('/register', catchAsync(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  // Check if user already exists
  let existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return next(
      new AppError('User with this email or username already exists', 400)
    );
  }

  // Create new user
  const newUser = new User({
    username,
    email,
    password,
    role: role || 'employee',
  });

  const savedUser = await newUser.save();

  // Generate token
  const token = generateToken(savedUser);

  // Prepare response (exclude password)
  const userResponse = savedUser.toObject();
  delete userResponse.password;

  res.status(201).json({
    token,
    user: userResponse,
  });
}));

// Login user
router.post('/login', catchAsync(async (req, res, next) => {
  console.log('Incoming Request Body:', req.body); // Debugging log for req.body

  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError('Please provide both username and password', 400));
  }

  // Find user and include password for comparison
  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Generate token
  const token = generateToken(user);

  if (!token) {
    console.error('Token generation failed'); // Debugging log for token issues
    return next(new AppError('Failed to generate token', 500));
  }

  console.log('Generated Token:', token); // Debugging log for token

  // Prepare response (exclude password)
  const userResponse = user.toObject();
  delete userResponse.password;

  res.json({
    token, // Add the token to the response
    user: userResponse,
  });
}));

// Middleware to protect routes
const protect = catchAsync(async (req, res, next) => {
  // Check if token exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Find user and attach to request
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  req.user = currentUser;
  next();
});

// Get current user profile
router.get('/me', protect, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.json(user);
}));

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

module.exports = {
  authRoutes: router,
  protect,
  authorize,
};