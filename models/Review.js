const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
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
  submissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'InProgress', 'Completed', 'Acknowledged'],
    default: 'Draft'
  },
  reviewType: {
    type: String,
    enum: ['Annual', 'Quarterly', 'Mid-Year', 'Probation'],
    default: 'Annual'
  },
  ratings: {
    performanceRating: {
      type: Number,
      min: 1,
      max: 5
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5
    },
    teamworkRating: {
      type: Number,
      min: 1,
      max: 5
    },
    leadershipRating: {
      type: Number,
      min: 1,
      max: 5
    },
    technicalSkillsRating: {
      type: Number,
      min: 1,
      max: 5
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  feedback: {
    strengths: {
      type: String,
      trim: true
    },
    areasForImprovement: {
      type: String,
      trim: true
    },
    comments: {
      type: String,
      trim: true
    }
  },
  goals: [{
    description: {
      type: String,
      required: true,
      trim: true
    },
    targetDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'Canceled'],
      default: 'Not Started'
    },
    progressNotes: {
      type: String,
      trim: true
    }
  }],
  acknowledgement: {
    acknowledged: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date
    },
    employeeComments: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Virtual for calculating average rating
ReviewSchema.virtual('averageRating').get(function() {
  const ratings = [
    this.ratings.performanceRating,
    this.ratings.communicationRating,
    this.ratings.teamworkRating,
    this.ratings.leadershipRating,
    this.ratings.technicalSkillsRating
  ].filter(rating => rating != null);
  
  if (ratings.length === 0) return null;
  
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

module.exports = mongoose.model('Review', ReviewSchema);