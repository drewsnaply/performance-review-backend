const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  frequency: {
    type: String,
    enum: ['Annually', 'Semi-Annually', 'Quarterly', 'Monthly', 'Custom'],
    default: 'Annually'
  },
  workflow: {
    steps: [{
      role: {
        type: String,
        enum: ['Employee', 'Manager', 'Department Head', 'HR'],
        required: true
      },
      order: {
        type: Number,
        required: true
      }
    }]
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Draft'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Changed from 'Employee' to 'User'
    required: true
  },
  sections: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: true
    },
    questions: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        enum: ['Rating', 'Text', 'MultipleChoice', 'Checkbox'],
        default: 'Rating'
      },
      required: {
        type: Boolean,
        default: true
      },
      options: [String], // For multiple choice or checkbox questions
      ratingScale: {
        min: {
          type: Number,
          default: 1
        },
        max: {
          type: Number,
          default: 5
        }
      }
    }]
  }],
  defaultGoals: [{
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('ReviewTemplate', ReviewTemplateSchema);