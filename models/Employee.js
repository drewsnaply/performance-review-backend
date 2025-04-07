const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
  position: {
    type: String,
    required: false,
    trim: true
  },
  jobTitle: {
    type: String,
    required: false,
    trim: true
  },
  title: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin', 'superadmin'],
    default: 'employee'
  },
  managedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
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
  },
  password: {
    type: String,
    required: function() {
      return this.isNew;
    },
    select: false
  },
  requirePasswordChange: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware for password hashing
EmployeeSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to synchronize job title fields
EmployeeSchema.pre('save', function(next) {
  const jobTitle = this.position || this.jobTitle || this.title || '';
  
  this.position = jobTitle;
  this.jobTitle = jobTitle;
  this.title = jobTitle;
  
  next();
});

// Helper methods for role-based permissions
EmployeeSchema.methods.hasRole = function(roles) {
  if (typeof roles === 'string') {
    return this.role === roles;
  }
  return roles.includes(this.role);
};

// Method to check if this user can manage another employee
EmployeeSchema.methods.canManageEmployee = function(employeeId) {
  if (this.role === 'superadmin' || this.role === 'admin') {
    return true;
  }
  
  if (this.role === 'manager') {
    if (employeeId.toString() === this._id.toString()) {
      return true;
    }
    return false;
  }
  
  return employeeId.toString() === this._id.toString();
};

// Method to check if this user can manage a department
EmployeeSchema.methods.canManageDepartment = function(departmentId) {
  if (this.role === 'superadmin' || this.role === 'admin') {
    return true;
  }
  
  if (this.role === 'manager') {
    return this.managedDepartments && 
           this.managedDepartments.some(id => id.toString() === departmentId.toString());
  }
  
  return false;
};

// Password verification method
EmployeeSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual field for full name
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Email validation
EmployeeSchema.path('email').validate(function(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}, 'Invalid email format');

// Static method to create an initial superadmin user if none exists
EmployeeSchema.statics.createInitialSuperAdmin = async function() {
  const superAdminExists = await this.findOne({ role: 'superadmin' });
  
  if (!superAdminExists) {
    console.log('Creating initial super admin user...');
    
    try {
      await this.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@example.com',
        username: 'superadmin',
        password: 'SuperAdmin123!', // Will be hashed automatically
        role: 'superadmin',
        department: 'Administration',
        isActive: true,
        requirePasswordChange: true
      });
      
      console.log('Initial super admin created successfully.');
    } catch (error) {
      console.error('Failed to create initial super admin:', error);
    }
  }
};

module.exports = mongoose.model('Employee', EmployeeSchema);