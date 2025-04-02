const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// GET all employees (only for managers and admins)
router.get('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  const employees = await Employee.find();
  res.json(employees);
}));

// GET employee by ID (only for managers and admins, or the employee themselves)
router.get('/:id', protect, catchAsync(async (req, res, next) => {
  // Allow access if user is admin, manager, or the employee themselves
  if (req.user.role === 'admin' || 
      req.user.role === 'manager' || 
      req.user.id === req.params.id) {
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
  // Validate request body
  if (!req.body) {
    return next(new AppError('No employee data provided', 400));
  }

  const newEmployee = new Employee(req.body);
  const employee = await newEmployee.save();
  
  res.status(201).json(employee);
}));

// PUT update employee (only for managers and admins)
router.put('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body) {
    return next(new AppError('No update data provided', 400));
  }

  const employee = await Employee.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { 
      new: true, 
      runValidators: true 
    }
  );

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.json(employee);
}));

// DELETE employee (only for admins)
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res, next) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.status(204).send();
}));

module.exports = router;