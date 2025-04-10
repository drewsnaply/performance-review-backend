const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewTemplateAssignmentSchema = new Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewTemplate',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'InProgress', 'Completed', 'Canceled'],
    default: 'Pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  reviewPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  completionDate: {
    type: Date
  },
  createdReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Virtual for time remaining
ReviewTemplateAssignmentSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'Completed' || this.status === 'Canceled') {
    return 0;
  }
  
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Virtual for completion status percentage
ReviewTemplateAssignmentSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'Completed') return 100;
  if (this.status === 'Pending') return 0;
  if (this.status === 'Canceled') return 0;
  
  // For InProgress status, you could implement a more sophisticated calculation
  // based on the actual review completion if you track that
  return 50;
});

module.exports = mongoose.model('ReviewTemplateAssignment', ReviewTemplateAssignmentSchema);