const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Question schema
const QuestionSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'rating', 'yesno', 'multiple-choice'],
    default: 'text'
  },
  required: {
    type: Boolean,
    default: true
  },
  options: {
    type: [String],
    default: []
  }
});

// Section schema
const SectionSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  weight: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  questions: [QuestionSchema]
});

// Review Template schema
const ReviewTemplateSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  frequency: {
    type: String,
    enum: ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly'],
    default: 'Annual'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  sections: [SectionSchema],
  
  // Enhanced features
  includesSelfReview: {
    type: Boolean,
    default: false
  },
  includes360Review: {
    type: Boolean,
    default: false
  },
  includesManagerReview: {
    type: Boolean,
    default: true
  },
  includesGoals: {
    type: Boolean,
    default: false
  },
  includesKPIs: {
    type: Boolean,
    default: false
  },
  
  // Legacy field - kept for backward compatibility
  active: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true  // This adds createdAt and updatedAt automatically
});

// Pre-save middleware to update timestamps
ReviewTemplateSchema.pre('save', function(next) {
  // Ensure active field matches status for backward compatibility
  this.active = (this.status === 'Active');
  next();
});

// Create model from schema
const ReviewTemplate = mongoose.model('ReviewTemplate', ReviewTemplateSchema);

module.exports = ReviewTemplate;