const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// KPI Schema
const KpiSchema = new Schema({
  title: {
    type: String,
    required: [true, 'KPI title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'KPI category is required'],
    enum: ['Performance', 'Development', 'Business', 'Customer', 'Financial', 'Team', 'Custom'],
    default: 'Performance'
  },
  target: {
    type: String,
    required: [true, 'KPI target is required']
  },
  targetValue: {
    type: Number
  },
  unit: {
    type: String,
    trim: true
  },
  frequency: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'],
    default: 'Quarterly'
  },
  department: {
    type: Schema.Types.ObjectId,
    ref: 'Department'
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Archived'],
    default: 'Active'
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

// Pre-save middleware to update timestamp
KpiSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compile model
const KPI = mongoose.model('KPI', KpiSchema);

module.exports = KPI;