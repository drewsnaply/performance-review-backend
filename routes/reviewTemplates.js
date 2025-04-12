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

// Important: This route must be defined BEFORE the /:id route to avoid conflicts
router.get('/assignments', protect, catchAsync(async (req, res, next) => {
  console.log('GET /api/templates/assignments - Request received');
  try {
    // Return empty array if something goes wrong during query
    // to prevent frontend from breaking
    let assignments = [];
    
    // Try to query assignments, but handle potential errors gracefully
    try {
      assignments = await ReviewTemplateAssignment.find({})
        .populate('template', 'name frequency')
        .populate('employee', 'firstName lastName email')
        .populate('reviewer', 'firstName lastName email')
        .populate('assignedBy', 'firstName lastName email')
        .lean() || [];
      
      console.log(`Found ${assignments.length} assignments`);
    } catch (err) {
      console.error('Error in assignments query:', err);
      // Continue with empty array
    }
    
    res.json(assignments);
  } catch (err) {
    console.error('Error in assignments handler:', err);
    // Return empty array instead of error to prevent frontend crash
    res.json([]);
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

// POST new template assignment
router.post('/assignments', protect, catchAsync(async (req, res, next) => {
  try {
    console.log('Creating new assignment:', req.body);
    
    // Create new assignment with all required fields
    const newAssignment = new ReviewTemplateAssignment({
      ...req.body,
      createdBy: req.user._id,
      assignedBy: req.user._id,  // Default to current user if not specified
      reviewer: req.body.reviewer || req.user._id,
      // Set default review period if not provided
      reviewPeriod: req.body.reviewPeriod || {
        start: new Date(),
        end: new Date(new Date().setMonth(new Date().getMonth() + 1))
      }
    });
    
    const assignment = await newAssignment.save();
    
    // Populate references for response
    const populatedAssignment = await ReviewTemplateAssignment.findById(assignment._id)
      .populate('template', 'name frequency')
      .populate('employee', 'firstName lastName email')
      .populate('reviewer', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email');
    
    res.status(201).json(populatedAssignment);
  } catch (err) {
    console.error('Error creating assignment:', err);
    return next(new AppError(`Failed to create assignment: ${err.message}`, 500));
  }
}));

// Start a review from an assignment
router.post('/assignments/:id/start', protect, catchAsync(async (req, res, next) => {
  try {
    console.log(`Starting review for assignment ${req.params.id}`);
    
    const assignment = await ReviewTemplateAssignment.findById(req.params.id)
      .populate('template');
    
    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }
    
    // Check if the user is authorized to start this review
    const canStart = 
      req.user.role === 'admin' || 
      req.user.role === 'superadmin' ||
      req.user._id.toString() === assignment.reviewer.toString();
    
    if (!canStart) {
      return next(new AppError('You are not authorized to start this review', 403));
    }
    
    // Create a new review based on the template
    const Review = require('../models/Review');
    
    // Check if a review already exists
    if (assignment.createdReview) {
      try {
        const existingReview = await Review.findById(assignment.createdReview);
        if (existingReview) {
          return res.json({ 
            message: 'Review already exists',
            review: existingReview
          });
        }
      } catch (err) {
        console.error('Error checking existing review:', err);
        // Continue if the existing review lookup fails
      }
    }
    
    // Update assignment status and start date
    assignment.status = 'InProgress';
    assignment.startDate = new Date();
    
    // Create a new review with proper error handling
    try {
      const newReview = new Review({
        employee: assignment.employee,
        reviewer: assignment.reviewer,
        template: assignment.template._id,
        status: 'InProgress',
        reviewPeriod: assignment.reviewPeriod,
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
      assignment.createdReview = review._id;
      await assignment.save();
      
      res.status(201).json({
        message: 'Review started successfully',
        review
      });
    } catch (err) {
      console.error('Error creating review:', err);
      return next(new AppError(`Failed to create review: ${err.message}`, 500));
    }
  } catch (err) {
    console.error('Error in start review handler:', err);
    return next(new AppError(`Error starting review: ${err.message}`, 500));
  }
}));

// Get specific assignment
router.get('/assignments/:id', protect, catchAsync(async (req, res, next) => {
  try {
    const assignment = await ReviewTemplateAssignment.findById(req.params.id)
      .populate('template', 'name frequency sections')
      .populate('employee', 'firstName lastName email')
      .populate('reviewer', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email');
    
    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }
    
    res.json(assignment);
  } catch (err) {
    console.error('Error fetching assignment:', err);
    return next(new AppError(`Failed to fetch assignment: ${err.message}`, 500));
  }
}));

// Update assignment status
router.put('/assignments/:id', protect, catchAsync(async (req, res, next) => {
  try {
    const assignment = await ReviewTemplateAssignment.findById(req.params.id);
    
    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }
    
    // Check if the user is authorized to update this assignment
    const canUpdate = 
      req.user.role === 'admin' || 
      req.user.role === 'superadmin' ||
      req.user._id.toString() === assignment.reviewer.toString() ||
      req.user._id.toString() === assignment.assignedBy.toString();
    
    if (!canUpdate) {
      return next(new AppError('You are not authorized to update this assignment', 403));
    }
    
    // Handle completion date for 'Completed' status
    if (req.body.status === 'Completed' && assignment.status !== 'Completed') {
      assignment.completionDate = new Date();
    }
    
    // Update the assignment
    const updatedAssignment = await ReviewTemplateAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('template', 'name frequency')
     .populate('employee', 'firstName lastName email')
     .populate('reviewer', 'firstName lastName email')
     .populate('assignedBy', 'firstName lastName email');
    
    res.json(updatedAssignment);
  } catch (err) {
    console.error('Error updating assignment:', err);
    return next(new AppError(`Failed to update assignment: ${err.message}`, 500));
  }
}));

// Delete assignment (admin only)
router.delete('/assignments/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  try {
    const assignment = await ReviewTemplateAssignment.findById(req.params.id);
    
    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }
    
    await ReviewTemplateAssignment.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting assignment:', err);
    return next(new AppError(`Failed to delete assignment: ${err.message}`, 500));
  }
}));

module.exports = router;