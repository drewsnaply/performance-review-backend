const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');

// FIXED: Import middleware directly using object destructuring with the updated export method
const { protect, authorize } = require('./auth');

// GET all employees (only for managers and admins)
router.get('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  console.log('GET /api/employees route hit');
  const employees = await Employee.find();
  res.json(employees);
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

// POST new employee (temporary removal of authorization for testing)
router.post('/', protect, catchAsync(async (req, res, next) => {
  console.log('POST /api/employees route hit');
  console.log('Request Body:', req.body);

  // Validate request body
  const { firstName, lastName, email, department, role } = req.body;
  if (!firstName || !lastName || !email || !department || !role) {
    return next(new AppError('Missing required employee fields', 400));
  }

  const newEmployee = new Employee(req.body);
  const employee = await newEmployee.save();

  console.log('Employee saved:', employee);
  res.status(201).json(employee);
}));

// PUT update employee (only for managers and admins)
router.put('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  console.log(`PUT /api/employees/${req.params.id} route hit`);
  console.log('Update request:', req.body);

  if (!req.body) {
    return next(new AppError('No update data provided', 400));
  }

  const employee = await Employee.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  console.log('Employee updated:', employee);
  res.json(employee);
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