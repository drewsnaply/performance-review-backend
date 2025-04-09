const express = require('express');
const router = express.Router();
const PositionHistory = require('../models/PositionHistory');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// GET all position records (admin only)
router.get('/', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const positionRecords = await PositionHistory.find()
    .populate('employee', 'firstName lastName email')
    .populate('manager', 'firstName lastName email')
    .sort({ startDate: -1 });
  
  res.status(200).json(positionRecords);
}));

// GET position history for a specific employee
router.get('/employee/:employeeId', protect, catchAsync(async (req, res, next) => {
  const employeeId = req.params.employeeId;
  
  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Position history is less sensitive, so we allow broader access
  const positionHistory = await PositionHistory.find({ employee: employeeId })
    .populate('manager', 'firstName lastName email')
    .populate('linkedReview', 'reviewType submissionDate')
    .sort({ startDate: -1 });
  
  res.status(200).json(positionHistory);
}));

// POST new position record
router.post('/', protect, authorize('manager', 'admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { employee, title, department, startDate, changeReason } = req.body;
  
  // Check if employee exists
  const employeeExists = await Employee.findById(employee);
  if (!employeeExists) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Check if user has permission (managers can only add for employees they manage)
  if (req.user.role === 'manager') {
    const manages = await Employee.exists({ 
      _id: employee, 
      managedBy: req.user._id 
    });
    if (!manages) {
      return next(new AppError('You do not have permission to add position history for this employee', 403));
    }
  }
  
  // If this is a new position, mark existing current position as ended
  if (req.body.isCurrentPosition) {
    await PositionHistory.updateMany(
      { employee: employee, isCurrentPosition: true },
      { 
        isCurrentPosition: false,
        endDate: startDate || new Date()
      }
    );
  }
  
  // Create new position record
  const newPosition = new PositionHistory({
    ...req.body,
    manager: req.body.manager || req.user._id
  });
  
  const position = await newPosition.save();
  
  // Update the employee's position history and current job info if needed
  await Employee.findByIdAndUpdate(employee, {
    $push: { positionHistory: position._id },
    // Update current position fields if this is their current position
    ...(req.body.isCurrentPosition && {
      position: title,
      jobTitle: title,
      title: title,
      department: department
    })
  });
  
  res.status(201).json(position);
}));

// DELETE position record (admin only)
router.delete('/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const position = await PositionHistory.findById(req.params.id);
  
  if (!position) {
    return next(new AppError('Position record not found', 404));
  }
  
  // Remove reference from employee
  await Employee.findByIdAndUpdate(position.employee, {
    $pull: { positionHistory: position._id }
  });
  
  await PositionHistory.findByIdAndDelete(req.params.id);
  
  res.status(204).send();
}));

module.exports = router;