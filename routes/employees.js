const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');

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
router.post('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
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
    address
  } = req.body;
  
  // Ensure required fields are present
  if (!firstName || !lastName || !email || !department) {
    console.error('Missing required fields', req.body);
    return next(new AppError('Missing required employee fields', 400));
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

    // Prepare employee data with conditional fields
    const employeeData = {
      firstName,
      lastName,
      email,
      department,
      ...(position && { position }),
      role: role || 'employee',
      username: username || email.split('@')[0],
      ...(employmentType && { employmentType }),
      ...(dateOfBirth && { dateOfBirth }),
      ...(gender && { gender }),
      ...(contactNumber && { contactNumber }),
      ...(hireDate && { hireDate }),
      ...(address && { address })
    };

    // Create and save new employee
    const newEmployee = new Employee(employeeData);
    const employee = await newEmployee.save();

    console.log('Employee saved successfully:', employee);
    res.status(201).json(employee);
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

module.exports = router;