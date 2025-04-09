const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PositionHistorySchema = new Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  isCurrentPosition: {
    type: Boolean,
    default: true
  },
  responsibilities: {
    type: String,
    trim: true
  },
  changeReason: {
    type: String,
    enum: ['Hiring', 'Promotion', 'Lateral Move', 'Reorganization', 'Demotion', 'Other'],
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  notes: {
    type: String,
    trim: true
  },
  linkedReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PositionHistory', PositionHistorySchema);