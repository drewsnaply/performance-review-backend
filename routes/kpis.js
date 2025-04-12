const express = require('express');
const router = express.Router();
const KPI = require('../models/KPI');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// Get all KPIs
router.get('/', protect, catchAsync(async (req, res) => {
  const query = {};
  
  // Filter by department if provided
  if (req.query.department) {
    query.department = req.query.department;
  }
  
  // Filter by category if provided
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Filter by status (default to Active)
  query.status = req.query.status || 'Active';
  
  // If not admin and not global KPI, only show department KPIs
  if (!req.user.isAdmin) {
    query.$or = [
      { isGlobal: true },
      { department: req.user.department }
    ];
  }
  
  const kpis = await KPI.find(query)
    .populate('department', 'name')
    .sort({ category: 1, title: 1 });
  
  res.status(200).json(kpis);
}));

// Get KPIs for specific employee - MOVED THIS ROUTE BEFORE THE /:id ROUTE
router.get('/employee/:employeeId', protect, catchAsync(async (req, res) => {
  // TODO: Implement logic to get KPIs relevant to a specific employee
  // This could be based on department, role, or explicit assignment
  
  const employeeId = req.params.employeeId;
  
  // For now, just return department and global KPIs
  const employee = await Employee.findById(employeeId).select('department');
  
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }
  
  const kpis = await KPI.find({
    $or: [
      { isGlobal: true },
      { department: employee.department }
    ],
    status: 'Active'
  });
  
  res.status(200).json(kpis);
}));

// Get KPI by ID - THIS NEEDS TO COME AFTER MORE SPECIFIC ROUTES
router.get('/:id', protect, catchAsync(async (req, res) => {
  const kpi = await KPI.findById(req.params.id)
    .populate('department', 'name')
    .populate('createdBy', 'firstName lastName');
  
  if (!kpi) {
    throw new AppError('KPI not found', 404);
  }
  
  res.status(200).json(kpi);
}));

// Create new KPI
router.post('/', protect, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const {
    title,
    description,
    category,
    target,
    targetValue,
    unit,
    frequency,
    department,
    isGlobal,
    startDate,
    endDate,
    status
  } = req.body;
  
  // Validate required fields
  if (!title || !category || !target) {
    throw new AppError('Please provide title, category and target for the KPI', 400);
  }
  
  // Create KPI
  const newKPI = new KPI({
    title,
    description,
    category,
    target,
    targetValue: targetValue || null,
    unit: unit || '',
    frequency: frequency || 'Quarterly',
    department: department || req.user.department,
    isGlobal: isGlobal || false,
    startDate: startDate || new Date(),
    endDate: endDate || null,
    status: status || 'Active',
    createdBy: req.user.id
  });
  
  const savedKPI = await newKPI.save();
  
  // Populate references for response
  await savedKPI.populate([
    { path: 'department', select: 'name' },
    { path: 'createdBy', select: 'firstName lastName' }
  ]);
  
  res.status(201).json(savedKPI);
}));

// Update KPI
router.put('/:id', protect, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const {
    title,
    description,
    category,
    target,
    targetValue,
    unit,
    frequency,
    department,
    isGlobal,
    startDate,
    endDate,
    status
  } = req.body;
  
  // Find KPI
  const kpi = await KPI.findById(req.params.id);
  
  if (!kpi) {
    throw new AppError('KPI not found', 404);
  }
  
  // Check authorization
  if (!req.user.isAdmin && kpi.createdBy.toString() !== req.user.id) {
    throw new AppError('Not authorized to update this KPI', 403);
  }
  
  // Update fields
  if (title) kpi.title = title;
  if (description !== undefined) kpi.description = description;
  if (category) kpi.category = category;
  if (target) kpi.target = target;
  if (targetValue !== undefined) kpi.targetValue = targetValue;
  if (unit !== undefined) kpi.unit = unit;
  if (frequency) kpi.frequency = frequency;
  if (department) kpi.department = department;
  if (isGlobal !== undefined) kpi.isGlobal = isGlobal;
  if (startDate) kpi.startDate = startDate;
  if (endDate !== undefined) kpi.endDate = endDate;
  if (status) kpi.status = status;
  
  const updatedKPI = await kpi.save();
  
  // Populate references for response
  await updatedKPI.populate([
    { path: 'department', select: 'name' },
    { path: 'createdBy', select: 'firstName lastName' }
  ]);
  
  res.status(200).json(updatedKPI);
}));

// Delete KPI
router.delete('/:id', protect, authorize('admin'), catchAsync(async (req, res) => {
  const kpi = await KPI.findById(req.params.id);
  
  if (!kpi) {
    throw new AppError('KPI not found', 404);
  }
  
  await kpi.deleteOne();
  
  res.status(204).send();
}));

module.exports = router;