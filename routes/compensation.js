const express = require('express');
const router = express.Router();
const CompensationHistory = require('../models/CompensationHistory');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// GET all compensation records (admin only)
router.get('/', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const compensationRecords = await CompensationHistory.find()
    .populate('employee', 'firstName lastName email')
    .populate('approvedBy', 'firstName lastName email')
    .sort({ effectiveDate: -1 });
  
  res.status(200).json(compensationRecords);
}));

// GET compensation history for a specific employee
router.get('/employee/:employeeId', protect, catchAsync(async (req, res, next) => {
  const employeeId = req.params.employeeId;
  
  // Check if user has permission to view compensation
  const canView = 
    req.user.role === 'admin' || 
    req.user.role === 'superadmin' ||
    req.user._id.toString() === employeeId;
    
  if (!canView && req.user.role === 'manager') {
    // Check if user manages the employee
    const manages = await Employee.exists({ 
      _id: employeeId, 
      managedBy: req.user._id 
    });
    if (!manages) {
      return next(new AppError('You do not have permission to view this compensation history', 403));
    }
  } else if (!canView) {
    return next(new AppError('You do not have permission to view this compensation history', 403));
  }
  
  const compensationHistory = await CompensationHistory.find({ employee: employeeId })
    .populate('approvedBy', 'firstName lastName email')
    .populate('linkedReview', 'reviewType submissionDate')
    .sort({ effectiveDate: -1 });
  
  res.status(200).json(compensationHistory);
}));

// POST new compensation record
router.post('/', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { employee, salary, effectiveDate, reason } = req.body;
  
  // Check if employee exists
  const employeeExists = await Employee.findById(employee);
  if (!employeeExists) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Create new compensation record
  const newCompensation = new CompensationHistory({
    ...req.body,
    approvedBy: req.user._id
  });
  
  const compensation = await newCompensation.save();
  
  // Update the employee's current compensation
  await Employee.findByIdAndUpdate(employee, {
    $push: { compensationHistory: compensation._id },
    currentCompensation: {
      salary: salary,
      salaryType: req.body.salaryType || 'Annual',
      currency: req.body.currency || 'USD',
      lastReviewDate: new Date()
    }
  });
  
  res.status(201).json(compensation);
}));

// DELETE compensation record (admin only)
router.delete('/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const compensation = await CompensationHistory.findById(req.params.id);
  
  if (!compensation) {
    return next(new AppError('Compensation record not found', 404));
  }
  
  // Remove reference from employee
  await Employee.findByIdAndUpdate(compensation.employee, {
    $pull: { compensationHistory: compensation._id }
  });
  
  await CompensationHistory.findByIdAndDelete(req.params.id);
  
  res.status(204).send();
}));

module.exports = router;