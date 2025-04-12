const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Goal Schema
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
    type: Date
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'At Risk'],
    default: 'Not Started'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: {
    type: String
  },
  linkedKpi: {
    type: Schema.Types.ObjectId,
    ref: 'KPI'
  },
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  review: {
    type: Schema.Types.ObjectId,
    ref: 'Review'
  },
  cycle: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Annual'],
    default: 'Monthly'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update status based on progress
GoalSchema.pre('save', function(next) {
  // Update status based on progress if status isn't manually set to "At Risk"
  if (this.status !== 'At Risk') {
    if (this.progress >= 100) {
      this.status = 'Completed';
    } else if (this.progress > 0) {
      this.status = 'In Progress';
    } else {
      this.status = 'Not Started';
    }
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Compile model
const Goal = mongoose.model('Goal', GoalSchema);

module.exports = Goal;