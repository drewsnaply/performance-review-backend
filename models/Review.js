const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Progress Snapshot schema for tracking KPI and goal progress over time
const ProgressSnapshotSchema = new Schema({
  date: {
    type: Date,
    default: Date.now
  },
  goals: [{
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'Goal'
    },
    title: String,
    progress: Number,
    status: String,
    notes: String
  }],
  kpis: [{
    kpiId: {
      type: Schema.Types.ObjectId,
      ref: 'KPI'
    },
    title: String,
    currentValue: Schema.Types.Mixed,
    target: Schema.Types.Mixed,
    status: String,
    notes: String
  }],
  managerComments: {
    type: String,
    trim: true
  },
  employeeComments: {
    type: String,
    trim: true
  }
});

const ReviewSchema = new Schema({
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'ReviewTemplate'
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
    enum: ['Annual', 'Quarterly', 'Mid-Year', 'Probation', 'Monthly'],
    default: 'Annual'
  },
  // Sections from template
  sections: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    weight: {
      type: Number,
      default: 0
    },
    questions: [{
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
      options: [String],
      response: Schema.Types.Mixed
    }]
  }],
  // Enhanced ratings with scoring
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
  // Goals linked to the review
  goals: [{
    type: Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  // KPIs being tracked in this review
  kpis: [{
    kpi: {
      type: Schema.Types.ObjectId,
      ref: 'KPI'
    },
    currentValue: Schema.Types.Mixed,
    notes: String
  }],
  // Monthly progress snapshots for ongoing reviews
  progressSnapshots: [ProgressSnapshotSchema],
  // Acknowledgement by employee
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
  },
  // Features enabled from template
  features: {
    includesGoals: {
      type: Boolean,
      default: false
    },
    includesKPIs: {
      type: Boolean,
      default: false
    },
    includesSelfReview: {
      type: Boolean,
      default: false
    },
    includes360Review: {
      type: Boolean,
      default: false
    }
  },
  isOngoing: {
    type: Boolean,
    default: false
  },
  nextCheckInDate: {
    type: Date
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

// Virtual for completion percentage
ReviewSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'Completed' || this.status === 'Acknowledged') return 100;
  if (this.status === 'Draft') return 10;
  
  let totalQuestions = 0;
  let answeredQuestions = 0;
  
  this.sections.forEach(section => {
    section.questions.forEach(question => {
      if (question.required) {
        totalQuestions++;
        if (question.response !== undefined && question.response !== null && question.response !== '') {
          answeredQuestions++;
        }
      }
    });
  });
  
  if (totalQuestions === 0) return this.status === 'InProgress' ? 50 : 20;
  
  const percentage = Math.floor((answeredQuestions / totalQuestions) * 80) + 20;
  return Math.min(percentage, 90); // Cap at 90% until finalized
});

// Create model from schema
const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;