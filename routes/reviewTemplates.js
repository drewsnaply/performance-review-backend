const express = require('express');
const router = express.Router();
const ReviewTemplate = require('../models/ReviewTemplate');
const ReviewTemplateAssignment = require('../models/ReviewTemplateAssignment');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// GET all templates
router.get('/', protect, catchAsync(async (req, res, next) => {
  console.log('GET /api/templates - Request received');
  try {
    // Simple query with improved performance
    const templates = await ReviewTemplate.find({})
      .lean()  // Convert to plain JS objects for better performance
      .exec();
    
    console.log(`Found ${templates.length} templates`);
    res.json(templates);
  } catch (err) {
    console.error('Error fetching templates:', err);
    return next(new AppError('Failed to fetch templates', 500));
  }
}));

// GET template by ID
router.get('/:id', protect, catchAsync(async (req, res, next) => {
  const template = await ReviewTemplate.findById(req.params.id);
  
  if (!template) {
    return next(new AppError('Template not found', 404));
  }
  
  res.json(template);
}));

// POST new template
router.post('/', protect, catchAsync(async (req, res, next) => {
  const newTemplate = new ReviewTemplate({
    ...req.body,
    createdBy: req.user._id
  });
  
  const template = await newTemplate.save();
  res.status(201).json(template);
}));

// PUT update template
router.put('/:id', protect, catchAsync(async (req, res, next) => {
  const updatedTemplate = await ReviewTemplate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!updatedTemplate) {
    return next(new AppError('Template not found', 404));
  }
  
  res.json(updatedTemplate);
}));

// DELETE template
router.delete('/:id', protect, catchAsync(async (req, res, next) => {
  const template = await ReviewTemplate.findById(req.params.id);
  
  if (!template) {
    return next(new AppError('Template not found', 404));
  }
  
  await ReviewTemplate.findByIdAndDelete(req.params.id);
  res.status(204).send();
}));

// GET all template assignments
router.get('/assignments', protect, catchAsync(async (req, res, next) => {
  // Add appropriate filtering based on user role
  const assignments = await ReviewTemplateAssignment.find({})
    .populate('template', 'name frequency')
    .populate('employee', 'firstName lastName email')
    .populate('reviewer', 'firstName lastName email')
    .lean();
  
  res.json(assignments);
}));

// POST new template assignment
router.post('/assignments', protect, authorize('manager', 'admin'), catchAsync(async (req, res, next) => {
  const newAssignment = new ReviewTemplateAssignment({
    ...req.body,
    createdBy: req.user._id
  });
  
  const assignment = await newAssignment.save();
  
  // Populate references for response
  const populatedAssignment = await ReviewTemplateAssignment.findById(assignment._id)
    .populate('template', 'name frequency')
    .populate('employee', 'firstName lastName email')
    .populate('reviewer', 'firstName lastName email');
  
  res.status(201).json(populatedAssignment);
}));

// Start a review from an assignment
router.post('/assignments/:id/start', protect, catchAsync(async (req, res, next) => {
  const assignment = await ReviewTemplateAssignment.findById(req.params.id)
    .populate('template');
  
  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }
  
  // Check if the user is authorized to start this review
  const canStart = 
    req.user.role === 'admin' || 
    req.user._id.toString() === assignment.reviewer.toString();
  
  if (!canStart) {
    return next(new AppError('You are not authorized to start this review', 403));
  }
  
  // Create a new review based on the template
  const Review = require('../models/Review');
  
  // Check if a review already exists
  if (assignment.createdReview) {
    const existingReview = await Review.findById(assignment.createdReview);
    if (existingReview) {
      return res.json({ 
        message: 'Review already exists',
        review: existingReview
      });
    }
  }
  
  // Create a new review
  const newReview = new Review({
    employee: assignment.employee,
    reviewer: assignment.reviewer,
    template: assignment.template._id,
    status: 'InProgress',
    // Convert template sections to review sections
    sections: assignment.template.sections.map(section => ({
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
    }))
  });
  
  const review = await newReview.save();
  
  // Update the assignment with the created review
  assignment.status = 'InProgress';
  assignment.createdReview = review._id;
  await assignment.save();
  
  res.status(201).json({
    message: 'Review started successfully',
    review
  });
}));

module.exports = router;