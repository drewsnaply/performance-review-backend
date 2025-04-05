const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { catchAsync, AppError } = require('../errorHandler');

const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
  try {
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('Token Generation:', {
      userId: user._id,
      username: user.username,
      tokenCreated: new Date().toISOString()
    });

    return token;
  } catch (error) {
    console.error('Token Generation Error:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
};

// Register new user
router.post('/register', catchAsync(async (req, res, next) => {
  console.log('REGISTER REQUEST:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  const { username, email, password, role } = req.body;

  // Validate input
  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400));
  }

  // Check if user already exists
  let existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    console.log('Registration Failed - User Already Exists:', { username, email });
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

  if (!token) {
    return next(new AppError('Failed to generate authentication token', 500));
  }

  // Prepare response (exclude password)
  const userResponse = savedUser.toObject();
  delete userResponse.password;

  console.log('User Registered Successfully:', {
    userId: userResponse._id,
    username: userResponse.username
  });

  // Set explicit CORS headers for the response
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.status(201).json({
    token,
    user: userResponse,
  });
}));

// Login user with enhanced CORS handling
router.post('/login', catchAsync(async (req, res, next) => {
  console.log('LOGIN REQUEST:', {
    body: { username: req.body.username }, // Avoid logging password
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      referer: req.headers.referer,
      contentType: req.headers['content-type']
    },
    timestamp: new Date().toISOString()
  });

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    console.log('Login Failed - Missing Credentials');
    return next(new AppError('Please provide both username and password', 400));
  }

  // Find user and include password for comparison
  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    console.log('Login Failed - User Not Found:', { username });
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    console.log('Login Failed - Incorrect Password:', { username });
    return next(new AppError('Invalid credentials', 401));
  }

  // Generate token
  const token = generateToken(user);

  if (!token) {
    console.error('Login Failed - Token Generation Error');
    return next(new AppError('Failed to generate token', 500));
  }

  // Prepare response (exclude password)
  const userResponse = user.toObject();
  delete userResponse.password;

  console.log('Login Successful:', {
    userId: userResponse._id,
    username: userResponse.username
  });

  // Set explicit CORS headers for the response
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Set response
  res.status(200).json({
    token,
    user: userResponse,
  });
}));

// Middleware to protect routes
const protect = catchAsync(async (req, res, next) => {
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

// FIXED EXPORT METHOD: Use an object to export multiple items
module.exports = {
  router: router,
  protect: protect,
  authorize: authorize
};