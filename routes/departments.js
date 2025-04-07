const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { catchAsync, AppError } = require('../errorHandler');

// FIXED: Import middleware directly using object destructuring with the updated export method
const { protect, authorize, canAccess } = require('./auth');

// GET all departments
// - Everyone can access, but results are filtered by role
router.get('/', protect, catchAsync(async (req, res, next) => {
  try {
    let departments;
    
    // Filter departments based on role
    switch (req.user.role) {
      case 'superadmin':
      case 'admin':
        // Admins and super admins can see all departments
        departments = await Department.find();
        break;
        
      case 'manager':
        // Managers see departments they manage and their own department
        if (req.user.managedDepartments && req.user.managedDepartments.length > 0) {
          departments = await Department.find({
            $or: [
              { _id: { $in: req.user.managedDepartments } },
              { name: req.user.department }
            ]
          });
        } else {
          // If managedDepartments is not set, just show their own department
          departments = await Department.find({ name: req.user.department });
        }
        break;
        
      case 'employee':
      default:
        // Regular employees only see their own department
        departments = await Department.find({ name: req.user.department });
        break;
    }
    
    res.status(200).json(departments);
  } catch (error) {
    next(new AppError(`Error fetching departments: ${error.message}`, 500));
  }
}));

// GET department by ID
router.get('/:id', protect, canAccess('department'), catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }
  
  res.status(200).json(department);
}));

// POST new department (admin and superadmin only)
router.post('/', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body || !req.body.name) {
    return next(new AppError('Department name is required', 400));
  }

  try {
    const newDepartment = new Department(req.body);
    const department = await newDepartment.save();
    
    // If a department head was specified, update that employee
    if (req.body.head) {
      await Employee.findByIdAndUpdate(req.body.head, {
        $addToSet: { managedDepartments: department._id }
      });
    }
    
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return next(new AppError('A department with this name already exists', 400));
    }
    next(new AppError(`Error creating department: ${error.message}`, 500));
  }
}));

// PUT update department (managers can update their departments, admins can update any)
router.put('/:id', protect, canAccess('department'), catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body) {
    return next(new AppError('No update data provided', 400));
  }

  // Prevent managers from changing certain fields
  if (req.user.role === 'manager') {
    // Managers shouldn't be able to change the department head to someone else
    delete req.body.head;
  }

  // Perform the update
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

  res.status(200).json(department);
}));

// DELETE department (only for admins and superadmins)
router.delete('/:id', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  // Check if department has any employees
  const departmentToDelete = await Department.findById(req.params.id);
  
  if (!departmentToDelete) {
    return next(new AppError('Department not found', 404));
  }
  
  // Check if any employees are in this department
  const employeesInDepartment = await Employee.countDocuments({ department: departmentToDelete.name });
  
  if (employeesInDepartment > 0) {
    return next(new AppError('Cannot delete department with active employees. Please reassign employees first.', 400));
  }
  
  // If no employees, proceed with deletion
  await Department.findByIdAndDelete(req.params.id);
  res.status(204).send();
}));

// Assign a manager to a department (admin and superadmin only)
router.patch('/:id/manager', protect, authorize('admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const { managerId } = req.body;
  
  if (!managerId) {
    return next(new AppError('Manager ID is required', 400));
  }
  
  // Check if department exists
  const department = await Department.findById(req.params.id);
  if (!department) {
    return next(new AppError('Department not found', 404));
  }
  
  // Check if employee exists and is a manager
  const manager = await Employee.findById(managerId);
  if (!manager) {
    return next(new AppError('Employee not found', 404));
  }
  
  // Ensure the employee has at least manager role
  if (manager.role !== 'manager' && manager.role !== 'admin' && manager.role !== 'superadmin') {
    return next(new AppError('Employee must have at least manager role to manage a department', 400));
  }
  
  // Update the department
  department.head = managerId;
  await department.save();
  
  // Update the manager's managedDepartments
  if (!manager.managedDepartments.includes(department._id)) {
    manager.managedDepartments.push(department._id);
    await manager.save();
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      department
    }
  });
}));

module.exports = router;