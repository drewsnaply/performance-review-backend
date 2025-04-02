const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    maxlength: [50, 'Department name cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Department description cannot be more than 500 characters']
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Optional: Add a virtual to populate the head of department
DepartmentSchema.virtual('departmentHead', {
  ref: 'Employee',
  localField: 'head',
  foreignField: '_id',
  justOne: true
});

const Department = mongoose.model('Department', DepartmentSchema);

module.exports = Department;