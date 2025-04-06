const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmployeeSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  // Primary job title field
  position: {
    type: String,
    required: false,
    trim: true
  },
  // Added for frontend compatibility
  jobTitle: {
    type: String,
    required: false,
    trim: true
  },
  // Added for frontend compatibility
  title: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee'
  },
  employmentType: {
    type: String,
    required: false,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    required: false,
    trim: true
  },
  contactNumber: {
    type: String,
    required: false,
    trim: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Suspended']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,  // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to synchronize job title fields
EmployeeSchema.pre('save', function(next) {
  // Find the non-empty job title (if any)
  const jobTitle = this.position || this.jobTitle || this.title || '';
  
  // Synchronize all job title fields
  this.position = jobTitle;
  this.jobTitle = jobTitle;
  this.title = jobTitle;
  
  next();
});

// Optional: Add a virtual field for full name
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Optional: Email validation
EmployeeSchema.path('email').validate(function(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}, 'Invalid email format');

module.exports = mongoose.model('Employee', EmployeeSchema);