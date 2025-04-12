const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const { catchAsync, AppError } = require('../errorHandler');
const { protect } = require('./auth');

// Get all goals
router.get('/', protect, catchAsync(async (req, res) => {
  const query = {};
  
  // Filter by review
  if (req.query.reviewId) {
    query.review = req.query.reviewId;
  }
  
  // Filter by employee
  if (req.query.employeeId) {
    query.employee = req.query.employeeId;
  }
  
  // If user is not admin, only show their goals or goals they review
  if (!req.user.isAdmin) {
    query.$or = [
      { employee: req.user.id },
      { reviewer: req.user.id },
      { createdBy: req.user.id }
    ];
  }
  
  const goals = await Goal.find(query)
    .populate('linkedKpi', 'title category target')
    .populate('employee', 'firstName lastName')
    .populate('reviewer', 'firstName lastName')
    .sort({ targetDate: 1 });
  
  res.status(200).json(goals);
}));

// Get goal by ID
router.get('/:id', protect, catchAsync(async (req, res) => {
  const goal = await Goal.findById(req.params.id)
    .populate('linkedKpi', 'title category target')
    .populate('employee', 'firstName lastName')
    .populate('reviewer', 'firstName lastName');
  
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  
  // Check if user has access to this goal
  if (!req.user.isAdmin && 
    req.user.id !== goal.employee.toString() && 
    req.user.id !== goal.reviewer?.toString() && 
    req.user.id !== goal.createdBy?.toString()) {
    throw new AppError('Not authorized to access this goal', 403);
  }
  
  res.status(200).json(goal);
}));

// Create new goal
router.post('/', protect, catchAsync(async (req, res) => {
  const {
    title,
    description,
    targetDate,
    status,
    progress,
    notes,
    linkedKpi,
    employeeId,
    reviewId,
    cycle,
    isPrivate
  } = req.body;
  
  // Validate required fields
  if (!title) {
    throw new AppError('Goal title is required', 400);
  }
  
  // Create goal
  const newGoal = new Goal({
    title,
    description,
    targetDate,
    status: status || 'Not Started',
    progress: progress || 0,
    notes,
    linkedKpi,
    employee: employeeId || req.user.id,
    reviewer: req.user.isManager ? req.user.id : undefined,
    review: reviewId,
    cycle: cycle || 'Monthly',
    isPrivate: isPrivate || false,
    createdBy: req.user.id
  });
  
  await newGoal.save();
  
  // Populate references for response
  await newGoal.populate([
    { path: 'linkedKpi', select: 'title category target' },
    { path: 'employee', select: 'firstName lastName' },
    { path: 'reviewer', select: 'firstName lastName' }
  ]);
  
  res.status(201).json(newGoal);
}));

// Update goal
router.put('/:id', protect, catchAsync(async (req, res) => {
  const {
    title,
    description,
    targetDate,
    status,
    progress,
    notes,
    linkedKpi,
    cycle,
    isPrivate
  } = req.body;
  
  // Find goal
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  
  // Check if user has permission to update this goal
  if (!req.user.isAdmin && 
    req.user.id !== goal.employee.toString() && 
    req.user.id !== goal.reviewer?.toString() && 
    req.user.id !== goal.createdBy?.toString()) {
    throw new AppError('Not authorized to update this goal', 403);
  }
  
  // Update fields
  if (title) goal.title = title;
  if (description !== undefined) goal.description = description;
  if (targetDate) goal.targetDate = targetDate;
  if (status) goal.status = status;
  if (progress !== undefined) goal.progress = progress;
  if (notes !== undefined) goal.notes = notes;
  if (linkedKpi !== undefined) goal.linkedKpi = linkedKpi;
  if (cycle) goal.cycle = cycle;
  if (isPrivate !== undefined) goal.isPrivate = isPrivate;
  
  const updatedGoal = await goal.save();
  
  // Populate references for response
  await updatedGoal.populate([
    { path: 'linkedKpi', select: 'title category target' },
    { path: 'employee', select: 'firstName lastName' },
    { path: 'reviewer', select: 'firstName lastName' }
  ]);
  
  res.status(200).json(updatedGoal);
}));

// Update goal progress
router.patch('/:id/progress', protect, catchAsync(async (req, res) => {
  const { progress, status } = req.body;
  
  // Find goal
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  
  // Check if user has permission to update this goal
  if (!req.user.isAdmin && 
    req.user.id !== goal.employee.toString() && 
    req.user.id !== goal.reviewer?.toString() && 
    req.user.id !== goal.createdBy?.toString()) {
    throw new AppError('Not authorized to update this goal', 403);
  }
  
  // Update progress
  if (progress !== undefined) {
    goal.progress = progress;
  }
  
  // Update status (if provided)
  if (status) {
    goal.status = status;
  }
  
  const updatedGoal = await goal.save();
  
  // Populate references for response
  await updatedGoal.populate([
    { path: 'linkedKpi', select: 'title category target' },
    { path: 'employee', select: 'firstName lastName' },
    { path: 'reviewer', select: 'firstName lastName' }
  ]);
  
  res.status(200).json(updatedGoal);
}));

// Delete goal
router.delete('/:id', protect, catchAsync(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  
  // Check if user has permission to delete this goal
  if (!req.user.isAdmin && 
    req.user.id !== goal.employee.toString() && 
    req.user.id !== goal.createdBy?.toString()) {
    throw new AppError('Not authorized to delete this goal', 403);
  }
  
  await goal.deleteOne();
  
  res.status(204).send();
}));

module.exports = router;