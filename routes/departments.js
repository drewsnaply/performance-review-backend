const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { catchAsync, AppError } = require('../errorHandler');

// FIXED: Import middleware directly using object destructuring with the updated export method
const { protect, authorize } = require('./auth');

// GET all departments (only for managers and admins)
router.get('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  const departments = await Department.find();
  res.json(departments);
}));

// GET department by ID (only for managers and admins)
router.get('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }
  
  res.json(department);
}));

// POST new department (only for managers and admins)
router.post('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body) {
    return next(new AppError('No department data provided', 400));
  }

  const newDepartment = new Department(req.body);
  const department = await newDepartment.save();
  
  res.status(201).json(department);
}));

// PUT update department (only for managers and admins)
router.put('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body) {
    return next(new AppError('No update data provided', 400));
  }

  const department = await Department.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { 
      new: true, 
      runValidators: true 
    }
  );

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  res.json(department);
}));

// DELETE department (only for admins)
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res, next) => {
  const department = await Department.findByIdAndDelete(req.params.id);

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  res.status(204).send();
}));

module.exports = router;