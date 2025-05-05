const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User'); // Added for user-based operations
const { catchAsync, AppError } = require('../errorHandler');
const { sendWelcomeEmail } = require('../utils/emailService'); // Import email service

// FIXED: Import middleware directly using object destructuring with the updated export method
const { protect, authorize } = require('./auth');

// GET all employees (only for managers and admins)
router.get('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  console.log('GET /api/employees route hit');
  console.log('Authenticated User:', req.user ? req.user.username : 'No user');
  console.log('User Role:', req.user ? req.user.role : 'No role');

  try {
    const employees = await Employee.find();
    console.log('Employees found:', employees.length);
    
    res.status(200).json(employees);  // Simplified response to match frontend expectations
  } catch (error) {
    console.error('Error fetching employees:', error);
    next(new AppError('Error fetching employees', 500));
  }
}));

// GET employee by ID (only for managers, admins, or the employee themselves)
router.get('/:id', protect, catchAsync(async (req, res, next) => {
  console.log(`GET /api/employees/${req.params.id} route hit`);
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.id === req.params.id) {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    res.json(employee);
  } else {
    return next(new AppError('Not authorized to access this employee information', 403));
  }
}));

// POST new employee (only for managers and admins)
router.post('/', protect, authorize('manager', 'admin', 'superadmin'), catchAsync(async (req, res, next) => {
  console.log('POST /api/employees route hit');
  console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

  // Destructure all potential fields
  const { 
    firstName, 
    lastName, 
    email, 
    department, 
    position, 
    role, 
    username,
    employmentType,
    dateOfBirth,
    gender,
    contactNumber,
    hireDate,
    address,
    sendWelcomeEmail,
    // Include other fields from the form
  } = req.body;
  
  // Ensure required fields are present
  if (!firstName || !lastName || !email || !department) {
    console.error('Missing required fields', req.body);
    return next(new AppError('Missing required employee fields', 400));
  }

  // Check if the current user has permission to create a user with the specified role
  if (role === 'superadmin' && req.user.role !== 'superadmin') {
    return next(new AppError('Only Super Admins can create Super Admin accounts', 403));
  }

  try {
    // Check for existing employee by email or username
    const existingEmployee = await Employee.findOne({ 
      $or: [
        { email: email },
        { username: username || email.split('@')[0] }
      ]
    });

    if (existingEmployee) {
      console.error('Employee already exists', existingEmployee);
      return next(new AppError('An employee with this email or username already exists', 400));
    }

    // Generate temporary password and reset token if sending welcome email
    let tempPassword = 'TemporaryPass123!';
    let resetToken = null;
    let resetPasswordExpires = null; // Fixed: Define variable outside the if block
    
    if (sendWelcomeEmail) {
      // Generate more secure random token
      resetToken = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
      
      // Set expiration for 24 hours from now
      resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Prepare employee data with conditional fields
    const employeeData = {
      firstName,
      lastName,
      email,
      department,
      position: position || req.body.title || '',
      role: role || 'employee',
      username: username || email.split('@')[0],
      employmentType: employmentType || '',
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      contactNumber: contactNumber || '',
      hireDate: hireDate || new Date().toISOString().split('T')[0],
      address: address || '',
      password: tempPassword, // If using User model with authentication
      requirePasswordChange: true, // Flag to force password change on first login
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetPasswordExpires, // Fixed: Use the variable defined above
      
      // Add all other fields from the form
      middleName: req.body.middleName || '',
      preferredName: req.body.preferredName || '',
      city: req.body.city || '',
      state: req.body.state || '',
      postalCode: req.body.postalCode || '',
      country: req.body.country || '',
      pronouns: req.body.pronouns || '',
      maritalStatus: req.body.maritalStatus || '',
      ethnicity: req.body.ethnicity || '',
      citizenship: req.body.citizenship || '',
      workAuthorization: req.body.workAuthorization || '',
      visaStatus: req.body.visaStatus || '',
      visaExpiryDate: req.body.visaExpiryDate || '',
      education: req.body.education || '',
      languages: req.body.languages || '',
    };

    // Handle emergency contact information if provided
    if (req.body.emergencyContact) {
      employeeData.emergencyContact = {
        name: req.body.emergencyContact.name || '',
        relationship: req.body.emergencyContact.relationship || '',
        phone: req.body.emergencyContact.phone || ''
      };
    }

    // Create and save new employee
    const newEmployee = new Employee(employeeData);
    const employee = await newEmployee.save();

    // Send welcome email if requested
    let emailSent = false;
    if (sendWelcomeEmail && resetToken) {
      try {
        console.log('Attempting to send welcome email...');
        await sendWelcomeEmail(employee, resetToken);
        emailSent = true;
        console.log(`Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue even if email fails
      }
    }

    // Add emailSent flag to the response
    const responseData = employee.toObject();
    responseData.emailSent = emailSent;

    console.log('Employee saved successfully:', employee);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Detailed Error creating employee:', error);
    
    // Log specific validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors)
        .map(err => err.message)
        .join(', ');
      
      return next(new AppError(`Validation Error: ${errorMessages}`, 400));
    }
    
    next(new AppError('Error creating employee', 500));
  }
}));

// PUT update employee (only for managers and admins)
router.put('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  console.log(`PUT /api/employees/${req.params.id} route hit`);
  console.log('Update request:', req.body);

  if (!req.body) {
    return next(new AppError('No update data provided', 400));
  }

  // Check if trying to set superadmin role when not authorized
  if (req.body.role === 'superadmin' && req.user.role !== 'superadmin') {
    return next(new AppError('Only Super Admins can assign Super Admin role', 403));
  }

  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { 
        new: true,  // Return the modified document
        runValidators: true,  // Run model validations on update
        context: 'query'  // Needed for some validations to work correctly
      }
    );

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    console.log('Employee updated:', employee);
    res.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    
    // Improved error handling
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation Error: ${messages.join(', ')}`, 400));
    }
    
    next(new AppError('Error updating employee', 500));
  }
}));

// DELETE employee (only for admins)
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res, next) => {
  console.log(`DELETE /api/employees/${req.params.id} route hit`);
  const employee = await Employee.findByIdAndDelete(req.params.id);

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  console.log('Employee deleted:', employee);
  res.status(204).send();
}));

// NEW: POST route for adding skills to an employee
router.post('/:id/skills', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  const employeeId = req.params.id;
  
  console.log('Adding skill for employee:', employeeId);
  console.log('Skill data:', req.body);

  try {
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // Validate skill data
    if (!req.body.name) {
      return next(new AppError('Skill name is required', 400));
    }

    // Add the new skill to the skills array
    employee.skills.push({
      name: req.body.name,
      proficiencyLevel: req.body.proficiencyLevel || 1,
      yearsOfExperience: req.body.yearsOfExperience || 0,
      lastUsed: req.body.lastUsed || new Date(),
      notes: req.body.notes || ''
    });

    // Save the updated employee
    const updatedEmployee = await employee.save();

    console.log('Updated employee:', updatedEmployee);

    res.status(201).json(updatedEmployee);
  } catch (error) {
    console.error('Error adding skill:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation Error: ${messages.join(', ')}`, 400));
    }
    
    next(new AppError('Error adding skill', 500));
  }
}));

// NEW: Route to reset password and send welcome email
router.post('/:id/reset-password', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const employeeId = req.params.id;
  
  console.log(`POST /api/employees/${employeeId}/reset-password route hit`);
  
  try {
    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    // Update employee with reset token
    employee.resetPasswordToken = resetToken;
    employee.resetPasswordExpires = Date.now() + 86400000; // 24 hours
    employee.requirePasswordChange = true;
    
    await employee.save();
    
    // Send password reset email
    let emailSent = false;
    try {
      await sendWelcomeEmail(employee, resetToken);
      emailSent = true;
      console.log(`Password reset email sent to ${employee.email}`);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
    }
    
    res.status(200).json({
      message: emailSent 
        ? 'Password reset email sent successfully' 
        : 'Password reset initiated but email could not be sent',
      emailSent
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    next(new AppError('Error resetting password', 500));
  }
}));

module.exports = router;