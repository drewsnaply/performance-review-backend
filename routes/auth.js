const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Changed from Employee to User
const { catchAsync, AppError } = require('../errorHandler');
const router = express.Router();

// Function to generate a JWT Token
const generateToken = (user) => {
  try {
    return jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
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

  // Only allow creating users with roles up to admin
  // superadmin can only be created programmatically or by another superadmin
  const allowedRoles = ['employee', 'manager', 'admin'];
  const userRole = role && allowedRoles.includes(role) ? role : 'employee';

  const newUser = new User({ 
    username, 
    email, 
    password, 
    role: userRole,
    department: req.body.department || 'Unassigned'
  });
  
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
  console.log('Login attempt for:', req.body.username);
  console.log('Database being used:', mongoose.connection.db.databaseName);
  console.log('Collection being searched:', User.collection.name);
  
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError('Please provide both username and password', 400));
  }

  const user = await User.findOne({ username }).select('+password');
  if (!user) {
    console.log('User not found:', username);
    return next(new AppError('Invalid credentials', 401));
  }

  // Detailed logging for debugging
  console.log('User found:', {
    id: user._id,
    username: user.username,
    role: user.role
  });

  let isMatch = false;
  try {
    isMatch = await user.comparePassword(password); // Using the model method
  } catch (error) {
    console.error('Password comparison error:', error);
    return next(new AppError('Authentication error', 500));
  }

  if (!isMatch) {
    console.log('Password mismatch for user:', username);
    return next(new AppError('Invalid credentials', 401));
  }

  const token = generateToken(user);
  if (!token) {
    return next(new AppError('Failed to generate token', 500));
  }

  const userResponse = user.toObject();
  delete userResponse.password;

  // Log successful login
  console.log('Login successful for:', username);
  
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return next(new AppError('The user no longer exists', 401));
    }
    
    // Add user info to the request
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token', 401));
  }
});

// Enhanced role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    // Super admin can always access
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

// Resource-specific authorization middleware
const canAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Super admin can always access
      if (req.user.role === 'superadmin') {
        return next();
      }
      
      const resourceId = req.params.id;
      
      switch (resourceType) {
        case 'employee':
          if (req.user.role === 'admin') {
            return next(); // Admins can access all employees
          }
          
          // Check if this is the user's own profile or a direct report
          if (req.user._id.toString() === resourceId || (req.user.role === 'manager')) {
            return next();
          }
          break;
          
        case 'department':
          if (req.user.role === 'admin') {
            return next(); // Admins can access all departments
          }
          
          // Check if user is a manager
          if (req.user.role === 'manager') {
            return next();
          }
          break;
          
        default:
          // Unknown resource type
          return next(new AppError('Access check failed: Unknown resource type', 500));
      }
      
      // If we get here, access should be denied
      return next(new AppError('You do not have permission to access this resource', 403));
    } catch (error) {
      console.error('Access check error:', error);
      return next(new AppError('Access check failed', 500));
    }
  };
};

// Promote user to a higher role (admin or superadmin only)
router.patch('/promote/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const { id } = req.params;
  
  // Validate the requested role
  const validRoles = ['employee', 'manager', 'admin'];
  
  // Add superadmin to valid roles only if current user is superadmin
  if (req.user.role === 'superadmin') {
    validRoles.push('superadmin');
  }
  
  if (!role || !validRoles.includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }
  
  // Prevent promoting to superadmin unless current user is superadmin
  if (role === 'superadmin' && req.user.role !== 'superadmin') {
    return next(new AppError('Only superadmins can promote to superadmin', 403));
  }
  
  // Find user to promote
  const userToPromote = await User.findById(id);
  if (!userToPromote) {
    return next(new AppError('User not found', 404));
  }
  
  // Update the user's role
  userToPromote.role = role;
  await userToPromote.save();
  
  res.status(200).json({
    status: 'success',
    message: `User ${userToPromote.username} promoted to ${role}`,
    data: {
      user: userToPromote
    }
  });
}));

// Get current user profile
router.get('/me', protect, catchAsync(async (req, res) => {
  // User is already attached to req from the protect middleware
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
}));

// Reset password for a user (admin or superadmin only)
router.post('/reset-password/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Generate a temporary password
  const tempPassword = 'TemporaryPass123!';
  
  // Update the user with the temporary password
  user.password = tempPassword;
  user.requirePasswordChange = true;
  await user.save();
  
  // In a real system, you would send an email with the reset link or temp password
  // For now, we'll just return the temp password in the response
  res.status(200).json({
    status: 'success',
    message: 'Password has been reset',
    data: {
      tempPassword // In production, don't include this in the response!
    }
  });
}));

// Add mongoose import at the top
const mongoose = require('mongoose');

module.exports = {
  router,
  protect,
  authorize,
  canAccess
};