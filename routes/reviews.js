const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// GET all reviews (filtered by role)
router.get('/', protect, catchAsync(async (req, res, next) => {
  let query = {};
  
  // Filter reviews based on the user's role
  if (req.user.role === 'employee') {
    // Employees can only see their own reviews
    query.employee = req.user._id;
  } else if (req.user.role === 'manager') {
    // Managers can see reviews they conducted or for employees they manage
    const managedEmployees = await Employee.find({ managedBy: req.user._id }).select('_id');
    const managedEmployeeIds = managedEmployees.map(emp => emp._id);
    
    query.$or = [
      { reviewer: req.user._id },
      { employee: { $in: managedEmployeeIds } }
    ];
  }
  // Admins and superadmins can see all reviews
  
  const reviews = await Review.find(query)
    .populate('employee', 'firstName lastName email')
    .populate('reviewer', 'firstName lastName email')
    .sort({ submissionDate: -1 });
  
  res.status(200).json(reviews);
}));

// GET review by ID
router.get('/:id', protect, catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id)
    .populate('employee', 'firstName lastName email department position')
    .populate('reviewer', 'firstName lastName email');
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if user has permission to view this review
  const canView = 
    req.user.role === 'admin' || 
    req.user.role === 'superadmin' ||
    req.user._id.toString() === review.employee._id.toString() ||
    req.user._id.toString() === review.reviewer._id.toString();
    
  if (!canView && req.user.role === 'manager') {
    // Check if user manages the employee
    const manages = await Employee.exists({ 
      _id: review.employee._id, 
      managedBy: req.user._id 
    });
    if (!manages) {
      return next(new AppError('You do not have permission to view this review', 403));
    }
  } else if (!canView) {
    return next(new AppError('You do not have permission to view this review', 403));
  }
  
  res.status(200).json(review);
}));

// GET all reviews for a specific employee
router.get('/employee/:employeeId', protect, catchAsync(async (req, res, next) => {
  const employeeId = req.params.employeeId;
  
  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Check if user has permission to view this employee's reviews
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
      return next(new AppError('You do not have permission to view reviews for this employee', 403));
    }
  } else if (!canView) {
    return next(new AppError('You do not have permission to view reviews for this employee', 403));
  }
  
  const reviews = await Review.find({ employee: employeeId })
    .populate('reviewer', 'firstName lastName email')
    .sort({ submissionDate: -1 });
  
  res.status(200).json(reviews);
}));

// POST new review
router.post('/', protect, authorize('manager', 'admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { employee, reviewType, reviewPeriod } = req.body;
  
  // Check if employee exists
  const employeeExists = await Employee.findById(employee);
  if (!employeeExists) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Create new review with reviewer set to current user
  const newReview = new Review({
    ...req.body,
    reviewer: req.user._id,
    status: 'Draft'
  });
  
  const review = await newReview.save();
  
  // Add reference to the employee's reviews array
  await Employee.findByIdAndUpdate(employee, {
    $push: { reviews: review._id }
  });
  
  res.status(201).json(review);
}));

// PUT update review
router.put('/:id', protect, catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if user has permission to update this review
  const canUpdate = 
    req.user.role === 'admin' || 
    req.user.role === 'superadmin' ||
    req.user._id.toString() === review.reviewer._id.toString();
    
  if (!canUpdate) {
    return next(new AppError('You do not have permission to update this review', 403));
  }
  
  // Update the review
  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('employee', 'firstName lastName')
   .populate('reviewer', 'firstName lastName');
  
  res.status(200).json(updatedReview);
}));

// PATCH acknowledge review (employee only)
router.patch('/:id/acknowledge', protect, catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if user is the employee being reviewed
  if (req.user._id.toString() !== review.employee.toString()) {
    return next(new AppError('You can only acknowledge your own reviews', 403));
  }
  
  // Update acknowledgement
  review.acknowledgement = {
    acknowledged: true,
    date: new Date(),
    employeeComments: req.body.employeeComments || ''
  };
  
  review.status = 'Acknowledged';
  
  await review.save();
  
  res.status(200).json(review);
}));

// DELETE review (admin only)
router.delete('/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Remove reference from employee
  await Employee.findByIdAndUpdate(review.employee, {
    $pull: { reviews: review._id }
  });
  
  await Review.findByIdAndDelete(req.params.id);
  
  res.status(204).send();
}));

module.exports = router;