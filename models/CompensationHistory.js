const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompensationHistorySchema = new Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  salary: {
    type: Number,
    required: true
  },
  salaryType: {
    type: String,
    enum: ['Annual', 'Monthly', 'Hourly'],
    default: 'Annual'
  },
  currency: {
    type: String,
    default: 'USD'
  },
  reason: {
    type: String,
    enum: ['Hiring', 'Promotion', 'Annual Adjustment', 'Merit Increase', 'Market Adjustment', 'Other'],
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  linkedReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CompensationHistory', CompensationHistorySchema);