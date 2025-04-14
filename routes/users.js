const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');
const { sendWelcomeEmail } = require('../utils/emailService');

// GET all users (for Super Admin)
router.get('/', protect, authorize('superadmin'), catchAsync(async (req, res, next) => {
  console.log('GET /api/users route hit - Super Admin access');
  
  try {
    // Get all users, sorted by role
    const users = await User.find().select('-password').sort({ role: 1, username: 1 });
    console.log(`Found ${users.length} users`);
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    next(new AppError('Error fetching users', 500));
  }
}));

// POST - Create a new user (for Super Admin)
router.post('/', protect, authorize('superadmin'), catchAsync(async (req, res, next) => {
  console.log('POST /api/users route hit - Creating new user');
  
  const { username, email, firstName, lastName, role } = req.body;
  
  // Validate required fields
  if (!username || !email || !role) {
    return next(new AppError('Missing required fields', 400));
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return next(new AppError('A user with this email or username already exists', 400));
    }
    
    // Generate a temporary random password and reset token
    let tempPassword = 'TemporaryPassword123!';
    let resetToken = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
    
    try {
      // Try to use crypto-random-string if available
      const crypto = require('crypto-random-string');
      tempPassword = crypto({ length: 12, type: 'url-safe' });
      resetToken = crypto({ length: 32, type: 'url-safe' });
      console.log('Generated tokens using crypto-random-string');
    } catch (cryptoError) {
      console.error('Error with crypto-random-string, using fallback:', cryptoError);
      // We've already set fallback values above
    }
    
    // Create new user
    const newUser = new User({
      username,
      email,
      password: tempPassword, // Will be hashed by the User model
      firstName: firstName || '',
      lastName: lastName || '',
      role,
      isActive: true,
      requirePasswordChange: true,
      resetPasswordToken: resetToken,
      resetPasswordExpires: Date.now() + 86400000 // 24 hours
    });
    
    // Save the user first
    await newUser.save();
    console.log(`User ${username} created successfully`);
    
    // Then try to send email, but don't fail if email sending fails
    let emailSent = false;
    try {
      console.log('Attempting to send welcome email...');
      await sendWelcomeEmail(newUser, resetToken);
      emailSent = true;
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // We continue the process even if email fails
    }
    
    // Return user without password
    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;
    delete userWithoutPassword.resetPasswordToken;
    delete userWithoutPassword.resetPasswordExpires;
    
    // Add flag to indicate if email was sent
    userWithoutPassword.emailSent = emailSent;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation Error: ${messages.join(', ')}`, 400));
    }
    
    next(new AppError('Error creating user', 500));
  }
}));

// PUT - Update a user (for Super Admin)
router.put('/:id', protect, authorize('superadmin'), catchAsync(async (req, res, next) => {
  console.log(`PUT /api/users/${req.params.id} route hit - Updating user`);
  
  const userId = req.params.id;
  const { username, email, firstName, lastName, role, isActive } = req.body;
  
  // Don't allow changing self role (security measure)
  if (userId === req.user.id && req.body.role && req.body.role !== 'superadmin') {
    return next(new AppError('You cannot change your own role', 400));
  }
  
  try {
    // Prepare update object with only provided fields
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation Error: ${messages.join(', ')}`, 400));
    }
    
    next(new AppError('Error updating user', 500));
  }
}));

// DELETE - Delete a user (for Super Admin)
router.delete('/:id', protect, authorize('superadmin'), catchAsync(async (req, res, next) => {
  console.log(`DELETE /api/users/${req.params.id} route hit`);
  
  const userId = req.params.id;
  
  // Don't allow deleting self (security measure)
  if (userId === req.user.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }
  
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    next(new AppError('Error deleting user', 500));
  }
}));

// POST - Reset user password (for Super Admin)
router.post('/:id/reset-password', protect, authorize('superadmin'), catchAsync(async (req, res, next) => {
  console.log(`POST /api/users/${req.params.id}/reset-password route hit`);
  
  const userId = req.params.id;
  const { newPassword } = req.body;
  
  if (!newPassword) {
    return next(new AppError('New password is required', 400));
  }
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    user.password = newPassword;
    user.requirePasswordChange = true;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    next(new AppError('Error resetting password', 500));
  }
}));

module.exports = router;