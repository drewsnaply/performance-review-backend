const express = require('express');
const router = express.Router();
const ReviewTemplate = require('../models/ReviewTemplate');
const ReviewTemplateAssignment = require('../models/ReviewTemplateAssignment');
const Review = require('../models/Review');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// Get all templates
router.get('/', protect, catchAsync(async (req, res) => {
  const templates = await ReviewTemplate.find()
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
  
  res.status(200).json(templates);
}));

// Get all assignments - MOVED BEFORE THE ID ROUTE
router.get('/assignments', protect, catchAsync(async (req, res) => {
  let query = {};
  
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // If not admin, only show assignments for this user
  if (!req.user.isAdmin) {
    query.$or = [
      { reviewer: req.user.id },
      { employee: req.user.id },
      { assignedBy: req.user.id }
    ];
  }
  
  const assignments = await ReviewTemplateAssignment.find(query)
    .populate('template', 'name')
    .populate('employee', 'firstName lastName position')
    .populate('reviewer', 'firstName lastName position')
    .populate('assignedBy', 'firstName lastName')
    .sort({ dueDate: 1 });
  
  res.status(200).json(assignments);
}));

// Create new assignment
router.post('/assign', protect, authorize('admin', 'manager'), catchAsync(async (req, res) => {
  console.log("Assign template route hit");
  console.log("Request body:", req.body);

  const { templateId, employeeId, reviewerId, dueDate, reviewPeriod, notes } = req.body;
  
  // Validate inputs
  if (!templateId || !employeeId || !reviewerId || !dueDate || !reviewPeriod) {
    console.error("Missing required fields");
    throw new AppError('Missing required fields', 400);
  }
  
  // Check if template exists
  const template = await ReviewTemplate.findById(templateId);
  if (!template) {
    console.error("Template not found");
    throw new AppError('Template not found', 404);
  }
  
  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    console.error("Employee not found");
    throw new AppError('Employee not found', 404);
  }
  
  // Check if reviewer exists
  const reviewer = await Employee.findById(reviewerId);
  if (!reviewer) {
    console.error("Reviewer not found");
    throw new AppError('Reviewer not found', 404);
  }
  
  // Create assignment
  const newAssignment = new ReviewTemplateAssignment({
    template: templateId,
    employee: employeeId, 
    reviewer: reviewerId,
    assignedBy: req.user.id,
    dueDate,
    reviewPeriod, 
    notes
  });
  
  console.log("New assignment:", newAssignment);
  
  await newAssignment.save();
  
  // Populate references for response
  await newAssignment.populate([
    { path: 'template', select: 'name' },
    { path: 'employee', select: 'firstName lastName position' },
    { path: 'reviewer', select: 'firstName lastName position' },
    { path: 'assignedBy', select: 'firstName lastName' }
  ]);
  
  console.log("Assignment created successfully");
  
  res.status(201).json(newAssignment);
}));

// Update assignment
router.put('/assignments/:id', protect, catchAsync(async (req, res) => {
  // Only allow updating certain fields 
  const allowedUpdates = ['status', 'notes', 'dueDate'];
  const updateData = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  if (req.body.status === 'Completed') {
    updateData.completionDate = new Date();
  }

  const assignment = await ReviewTemplateAssignment.findById(req.params.id);

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  // Only admin, the assigner, or the reviewer can update
  if (!req.user.isAdmin && 
      req.user.id !== assignment.assignedBy.toString() && 
      req.user.id !== assignment.reviewer.toString()) {
    throw new AppError('Not authorized to update this assignment', 403);
  }

  // Update assignment
  const updatedAssignment = await ReviewTemplateAssignment.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'template', select: 'name' },
    { path: 'employee', select: 'firstName lastName position' },
    { path: 'reviewer', select: 'firstName lastName position' },
    { path: 'assignedBy', select: 'firstName lastName' }
  ]);

  res.status(200).json(updatedAssignment);
}));

// Delete assignment
router.delete('/assignments/:id', protect, authorize('admin', 'manager'), catchAsync(async (req, res) => {
  const assignment = await ReviewTemplateAssignment.findById(req.params.id);
  
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }
  
  // Only admin or the assigner can delete
  if (!req.user.isAdmin && req.user.id !== assignment.assignedBy.toString()) { 
    throw new AppError('Not authorized to delete this assignment', 403);
  }

  // Don't allow deleting completed assignments
  if (assignment.status === 'Completed') {
    throw new AppError('Cannot delete completed assignments', 400); 
  }

  await assignment.deleteOne();

  res.status(204).send();
}));

// Start review from assignment - UPDATED WITH MORE PERMISSIVE AUTHORIZATION
router.post('/assignments/:id/start', protect, catchAsync(async (req, res, next) => {
  try {
    console.log("Start review route hit for assignment ID:", req.params.id);
    console.log("User data:", req.user);
    
    const assignment = await ReviewTemplateAssignment.findById(req.params.id)
      .populate('template')
      .populate('employee')
      .populate('reviewer');

    if (!assignment) {
      console.error("Assignment not found with ID:", req.params.id);
      throw new AppError('Assignment not found', 404);
    }

    console.log("Assignment found:", assignment);
    console.log("Assignment status:", assignment.status);
    console.log("Assignment reviewer:", assignment.reviewer);
    console.log("Current user ID:", req.user.id);
    console.log("User is admin?", !!req.user.isAdmin);

    // MORE PERMISSIVE CHECK: Allow admin users to start any review
    if (!req.user.isAdmin && req.user.id !== assignment.reviewer.toString()) {
      console.error(`Authorization failed: User (${req.user.id}) is neither admin nor the assigned reviewer (${assignment.reviewer})`);
      throw new AppError('Not authorized to start this review. Only the assigned reviewer or an admin can start a review.', 403);
    }

    // Don't allow starting if already completed or canceled or in progress
    if (assignment.status !== 'Pending') {
      console.error(`Cannot start a ${assignment.status.toLowerCase()} assignment`);
      throw new AppError(`Cannot start a ${assignment.status.toLowerCase()} assignment. Only pending assignments can be started.`, 400);
    }

    console.log("Creating new review for assignment");
    
    // Create a new review based on the template
    const newReview = new Review({
      employee: assignment.employee._id,
      reviewer: assignment.reviewer._id,
      reviewPeriod: assignment.reviewPeriod,
      status: 'InProgress',
      startDate: new Date(),
      reviewType: assignment.template.frequency === 'Annually' ? 'Annual' : 
                  assignment.template.frequency === 'Semi-Annually' ? 'Mid-Year' :
                  assignment.template.frequency === 'Quarterly' ? 'Quarterly' : 'Custom',
      // Add other fields from template as needed
    });

    await newReview.save();
    console.log("New review created with ID:", newReview._id);

    // Update assignment with created review and status
    assignment.createdReview = newReview._id;
    assignment.status = 'InProgress';
    await assignment.save();
    console.log("Assignment updated with review reference");

    // Add reference to the employee's reviews array if that field exists
    try {
      if (assignment.employee && assignment.employee._id) {
        await Employee.findByIdAndUpdate(assignment.employee._id, {
          $push: { reviews: newReview._id }
        });
        console.log("Employee record updated with review reference");
      }
    } catch (employeeUpdateError) {
      console.error("Error updating employee record, but continuing:", employeeUpdateError);
      // Continue execution even if this fails
    }

    console.log("Review started successfully");
    res.status(201).json({
      success: true,
      message: 'Review started successfully',
      assignment,
      review: newReview 
    });
  } catch (error) {
    console.error('Error starting review:', error);
    next(error);
  }
}));

// Get template by ID - MOVED AFTER THE /assignments ROUTE
router.get('/:id', protect, catchAsync(async (req, res) => {
  const template = await ReviewTemplate.findById(req.params.id)
    .populate('createdBy', 'firstName lastName');
  
  if (!template) {
    throw new AppError('Template not found', 404);
  }
  
  res.status(200).json(template);
}));

// Create new template  
router.post('/', protect, authorize('admin', 'manager'), catchAsync(async (req, res) => {
  console.log("Create template route hit");
  console.log("User data:", req.user);
  
  try {
    // Create template
    const newTemplate = new ReviewTemplate({
      ...req.body,
      createdBy: req.user.id // This should now match the 'User' reference
    });
    
    console.log("Template instance created");
    await newTemplate.save();
    console.log("Template saved successfully");
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating template:", error.toString());
    console.error("Error stack:", error.stack);
    throw error;
  }
}));

// Update template
router.put('/:id', protect, authorize('admin', 'manager'), catchAsync(async (req, res) => {
  const template = await ReviewTemplate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!template) {
    throw new AppError('Template not found', 404);
  }
  
  res.status(200).json(template);
}));

// Delete template
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res) => {
  const template = await ReviewTemplate.findById(req.params.id);
  
  if (!template) {
    throw new AppError('Template not found', 404);
  }
  
  // Check if template is being used in any assignments
  const assignmentCount = await ReviewTemplateAssignment.countDocuments({ 
    template: req.params.id,
    status: { $in: ['Pending', 'InProgress'] }
  });
  
  if (assignmentCount > 0) {
    throw new AppError('Cannot delete template that is currently in use', 400);
  }
  
  await template.deleteOne();
  
  res.status(204).send();
}));

module.exports = router;