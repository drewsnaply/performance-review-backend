const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Employee = require('../models/Employee');
const Goal = require('../models/Goal');
const KPI = require('../models/KPI');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// Get all reviews (with filters)
router.get('/', protect, catchAsync(async (req, res) => {
  const query = {};
  
  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Filter by review type
  if (req.query.type) {
    query.reviewType = req.query.type;
  }
  
  // Filter by employee
  if (req.query.employee) {
    query.employee = req.query.employee;
  }
  
  // Filter by reviewer (the manager)
  if (req.query.reviewer) {
    query.reviewer = req.query.reviewer;
  }
  
  // If user is not admin, only show reviews they're involved in
  if (!req.user.isAdmin) {
    query.$or = [
      { employee: req.user.id },
      { reviewer: req.user.id }
    ];
  }
  
  const reviews = await Review.find(query)
    .populate('employee', 'firstName lastName email')
    .populate('reviewer', 'firstName lastName email')
    .populate('template', 'name frequency')
    .sort({ updatedAt: -1 });
  
  res.status(200).json(reviews);
}));

// Get review by ID
router.get('/:id', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('employee', 'firstName lastName email position department')
    .populate('reviewer', 'firstName lastName email')
    .populate('template', 'name frequency includesGoals includesKPIs includesSelfReview')
    .populate({
      path: 'goals',
      populate: {
        path: 'linkedKpi',
        select: 'title category target'
      }
    });
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user has access to this review
  if (!req.user.isAdmin && 
    req.user.id !== review.employee._id.toString() && 
    req.user.id !== review.reviewer._id.toString()) {
    throw new AppError('Not authorized to access this review', 403);
  }
  
  res.status(200).json(review);
}));

// Create new review
router.post('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const {
    employeeId,
    reviewType,
    startDate,
    endDate,
    template,
    includesGoals,
    includesKPIs,
    includesSelfReview
  } = req.body;
  
  // Validate required fields
  if (!employeeId || !reviewType || !startDate || !endDate) {
    throw new AppError('Please provide all required fields', 400);
  }
  
  // Create review
  const newReview = new Review({
    employee: employeeId,
    reviewer: req.user.id,
    reviewType,
    reviewPeriod: {
      start: startDate,
      end: endDate
    },
    status: 'Draft',
    template,
    features: {
      includesGoals: includesGoals || false,
      includesKPIs: includesKPIs || false,
      includesSelfReview: includesSelfReview || false
    },
    isOngoing: reviewType === 'Monthly' || reviewType === 'Quarterly'
  });
  
  // If using a template, copy sections from template
  if (template) {
    const ReviewTemplate = require('../models/ReviewTemplate');
    const templateData = await ReviewTemplate.findById(template);
    
    if (templateData) {
      newReview.sections = templateData.sections.map(section => ({
        title: section.title,
        description: section.description,
        weight: section.weight,
        questions: section.questions.map(q => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options,
          response: null // Initial empty response
        }))
      }));
      
      // Copy feature flags from template
      newReview.features = {
        includesGoals: templateData.includesGoals || false,
        includesKPIs: templateData.includesKPIs || false,
        includesSelfReview: templateData.includesSelfReview || false,
        includes360Review: templateData.includes360Review || false
      };
    }
  }
  
  const savedReview = await newReview.save();
  
  // Populate references for response
  await savedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  res.status(201).json(savedReview);
}));

// Update review
router.put('/:id', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user has permission to update this review
  if (!req.user.isAdmin && req.user.id !== review.reviewer.toString()) {
    throw new AppError('Not authorized to update this review', 403);
  }
  
  // Only allow updates if review is not completed or acknowledged
  if (review.status === 'Completed' || review.status === 'Acknowledged') {
    throw new AppError('Cannot update a completed or acknowledged review', 400);
  }
  
  // Update allowed fields
  if (req.body.sections) review.sections = req.body.sections;
  if (req.body.ratings) review.ratings = req.body.ratings;
  if (req.body.feedback) review.feedback = req.body.feedback;
  if (req.body.status && req.body.status !== 'Completed' && req.body.status !== 'Acknowledged') {
    review.status = req.body.status;
  }
  
  const updatedReview = await review.save();
  
  // Populate references for response
  await updatedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  res.status(200).json(updatedReview);
}));

// Submit review
router.put('/:id/submit', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user has permission to submit this review
  if (!req.user.isAdmin && req.user.id !== review.reviewer.toString()) {
    throw new AppError('Not authorized to submit this review', 403);
  }
  
  // Update status and submission date
  review.status = 'Submitted';
  review.submissionDate = new Date();
  
  const submittedReview = await review.save();
  
  // Populate references for response
  await submittedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  // TODO: Send notification to employee
  
  res.status(200).json(submittedReview);
}));

// Complete review (finalize)
router.put('/:id/complete', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user has permission to complete this review
  if (!req.user.isAdmin && req.user.id !== review.reviewer.toString()) {
    throw new AppError('Not authorized to complete this review', 403);
  }
  
  // Update status
  review.status = 'Completed';
  
  const completedReview = await review.save();
  
  // Populate references for response
  await completedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  // TODO: Send notification to employee
  
  res.status(200).json(completedReview);
}));

// Acknowledge review (by employee)
router.put('/:id/acknowledge', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user is the employee
  if (req.user.id !== review.employee.toString()) {
    throw new AppError('Only the employee can acknowledge this review', 403);
  }
  
  // Update acknowledgement
  review.status = 'Acknowledged';
  review.acknowledgement = {
    acknowledged: true,
    date: new Date(),
    employeeComments: req.body.comments || ''
  };
  
  const acknowledgedReview = await review.save();
  
  // Populate references for response
  await acknowledgedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  res.status(200).json(acknowledgedReview);
}));

// Record monthly check-in
router.post('/:id/checkin', protect, catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  // Check if user has permission to record check-in
  if (!req.user.isAdmin && req.user.id !== review.reviewer.toString()) {
    throw new AppError('Not authorized to record check-in for this review', 403);
  }
  
  // Add progress snapshot
  const { snapshot, nextCheckInDate } = req.body;
  
  // Set the check-in date if not provided
  if (!snapshot.date) {
    snapshot.date = new Date();
  }
  
  // Add snapshot to review
  if (!review.progressSnapshots) {
    review.progressSnapshots = [];
  }
  
  review.progressSnapshots.push(snapshot);
  
  // Set next check-in date if provided
  if (nextCheckInDate) {
    review.nextCheckInDate = nextCheckInDate;
  }
  
  // Make sure review is marked as in progress
  if (review.status === 'Draft') {
    review.status = 'InProgress';
  }
  
  // Update review
  const updatedReview = await review.save();
  
  // Update associated goals if present in snapshot
  if (snapshot.goals && snapshot.goals.length > 0) {
    for (const goalUpdate of snapshot.goals) {
      if (goalUpdate.goalId) {
        await Goal.findByIdAndUpdate(
          goalUpdate.goalId,
          { 
            progress: goalUpdate.progress,
            status: goalUpdate.status,
            notes: goalUpdate.notes,
            updatedBy: req.user.id
          },
          { new: true }
        );
      }
    }
  }
  
  // Populate references for response
  await updatedReview.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'reviewer', select: 'firstName lastName email' },
    { path: 'template', select: 'name frequency' }
  ]);
  
  res.status(200).json({ 
    message: 'Check-in recorded successfully',
    review: updatedReview
  });
}));

// Delete review
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    throw new AppError('Review not found', 404);
  }
  
  await review.deleteOne();
  
  res.status(204).send();
}));

// Get review statistics
router.get('/stats', protect, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  // Basic stats
  const totalReviews = await Review.countDocuments();
  const completedReviews = await Review.countDocuments({ status: 'Completed' });
  const inProgressReviews = await Review.countDocuments({ status: 'InProgress' });
  const pendingReviews = await Review.countDocuments({ status: 'Draft' });
  
  // Reviews by type
  const reviewsByType = await Review.aggregate([
    { $group: { _id: '$reviewType', count: { $sum: 1 } } }
  ]);
  
  // Average ratings
  const averageRatings = await Review.aggregate([
    { $match: { 'ratings.overallRating': { $exists: true } } },
    { 
      $group: { 
        _id: null,
        avgOverall: { $avg: '$ratings.overallRating' },
        avgPerformance: { $avg: '$ratings.performanceRating' },
        avgCommunication: { $avg: '$ratings.communicationRating' },
        avgTeamwork: { $avg: '$ratings.teamworkRating' },
        avgLeadership: { $avg: '$ratings.leadershipRating' },
        avgTechnical: { $avg: '$ratings.technicalSkillsRating' }
      } 
    }
  ]);
  
  res.status(200).json({
    totalReviews,
    completedReviews,
    inProgressReviews,
    pendingReviews,
    reviewsByType,
    averageRatings: averageRatings.length > 0 ? averageRatings[0] : null
  });
}));

module.exports = router;