const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GoalSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  targetDate: {
    type: Date,
    required: [true, 'Target date is required']
  },
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  review: {
    type: Schema.Types.ObjectId,
    ref: 'Review'
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'At Risk', 'Canceled'],
    default: 'Not Started'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  // Link to relevant KPI
  linkedKpi: {
    type: Schema.Types.ObjectId,
    ref: 'KPI'
  },
  // Progress history over time
  progressHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'At Risk', 'Canceled']
    },
    notes: {
      type: String,
      trim: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Whether this is a recurring goal
  cycle: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Annual', 'Custom'],
    default: 'Monthly'
  },
  // Whether this goal is private or visible to team
  isPrivate: {
    type: Boolean,
    default: false
  },
  // Department if this is a department goal
  department: {
    type: Schema.Types.ObjectId,
    ref: 'Department'
  },
  // Tag for categorizing goals
  category: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save middleware to update progress history
GoalSchema.pre('save', function(next) {
  // If progress or status changed, add to history
  if (this.isModified('progress') || this.isModified('status')) {
    // Get current user from middleware (need to set in routes)
    const userId = this.updatedBy || this.createdBy;
    
    this.progressHistory.push({
      date: new Date(),
      progress: this.progress,
      status: this.status,
      notes: this.notes || '',
      updatedBy: userId
    });
  }
  
  next();
});

// Virtual for time remaining
GoalSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'Completed' || this.status === 'Canceled') {
    return 0;
  }
  
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 ? diffDays : 0;
});

// Virtual for days overdue
GoalSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'Completed' || this.status === 'Canceled') {
    return 0;
  }
  
  const now = new Date();
  const target = new Date(this.targetDate);
  
  if (now <= target) {
    return 0;
  }
  
  const diffTime = now - target;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Create model from schema
const Goal = mongoose.model('Goal', GoalSchema);

module.exports = Goal;