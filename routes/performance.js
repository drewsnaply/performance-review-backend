const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const PositionHistory = require('../models/PositionHistory');
const { catchAsync, AppError } = require('../errorHandler');
const { protect, authorize } = require('./auth');

// Helper functions for calculations
const calculateOverallRating = (reviews) => {
  if (reviews.length === 0) return 0;
  
  const validRatings = reviews
    .filter(review => review.ratings && review.ratings.overallRating)
    .map(review => review.ratings.overallRating);
  
  return validRatings.length > 0 
    ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length 
    : 0;
};

const calculateGoalCompletionRate = (reviews) => {
  if (reviews.length === 0) return 0;
  
  const completedGoals = reviews.reduce((total, review) => {
    if (review.goals) {
      const completedCount = review.goals.filter(goal => goal.status === 'Completed').length;
      total += completedCount;
    }
    return total;
  }, 0);
  
  const totalGoals = reviews.reduce((total, review) => 
    total + (review.goals ? review.goals.length : 0), 0);
  
  return totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;
};

const extractRecentAchievements = (reviews) => {
  return reviews
    .filter(review => review.feedback && review.feedback.strengths)
    .map(review => ({
      title: review.feedback.strengths,
      date: review.submissionDate
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
};

const calculateSkillGrowth = (reviews, positionHistory) => {
  // This is a simplified implementation
  const skillGrowth = {};
  
  reviews.forEach(review => {
    if (review.ratings) {
      Object.keys(review.ratings).forEach(key => {
        if (key.includes('Rating') && key !== 'overallRating') {
          const skillName = key.replace('Rating', '');
          if (!skillGrowth[skillName]) {
            skillGrowth[skillName] = {
              levels: [review.ratings[key]],
              trend: 0
            };
          } else {
            skillGrowth[skillName].levels.push(review.ratings[key]);
          }
        }
      });
    }
  });

  // Calculate trends and average levels
  Object.keys(skillGrowth).forEach(skill => {
    const levels = skillGrowth[skill].levels;
    skillGrowth[skill] = {
      skill: skill,
      level: Math.round(levels.reduce((sum, val) => sum + val, 0) / levels.length),
      trend: levels.length > 1 
        ? Math.round(((levels[levels.length - 1] - levels[0]) / levels[0]) * 100) 
        : 0
    };
  });

  return Object.values(skillGrowth);
};

// Performance route
router.get('/:employeeId', protect, catchAsync(async (req, res, next) => {
  const employeeId = req.params.employeeId;
  
  try {
    // Fetch performance-related data
    const reviews = await Review.find({ employee: employeeId });
    const positionHistory = await PositionHistory.find({ employee: employeeId });
    
    // Calculate metrics
    const performanceData = {
      overallRating: calculateOverallRating(reviews),
      reviewCount: reviews.length,
      goalCompletionRate: calculateGoalCompletionRate(reviews),
      recentAchievements: extractRecentAchievements(reviews),
      skillGrowth: calculateSkillGrowth(reviews, positionHistory)
    };
    
    res.json(performanceData);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    next(new AppError('Error fetching performance data', 500));
  }
}));

// NEW ENDPOINT: Start a review
router.post('/start/:reviewId', protect, authorize('manager', 'admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const reviewId = req.params.reviewId;
  
  // Find the review
  const review = await Review.findById(reviewId);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if the user has permission to start this review
  const canStart = 
    req.user.role === 'admin' || 
    req.user.role === 'superadmin' ||
    req.user._id.toString() === review.reviewer.toString();
  
  if (!canStart) {
    return next(new AppError('You do not have permission to start this review', 403));
  }
  
  // Check if review is in a state where it can be started
  if (review.status !== 'Pending' && review.status !== 'Draft') {
    return next(new AppError(`Review cannot be started from ${review.status} status`, 400));
  }
  
  // Update the review status
  review.status = 'In Progress';
  review.startDate = new Date();
  
  await review.save();
  
  res.status(200).json({
    success: true,
    message: 'Review started successfully',
    review
  });
}));

// NEW ENDPOINT: Add a more specific endpoint based on the error URL pattern
router.post('/b/:reviewId/start', protect, authorize('manager', 'admin', 'superadmin'), catchAsync(async (req, res, next) => {
  const reviewId = req.params.reviewId;
  
  // Find the review
  const review = await Review.findById(reviewId);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if the user has permission to start this review
  const canStart = 
    req.user.role === 'admin' || 
    req.user.role === 'superadmin' ||
    req.user._id.toString() === review.reviewer.toString();
  
  if (!canStart) {
    return next(new AppError('You do not have permission to start this review', 403));
  }
  
  // Check if review is in a state where it can be started
  if (review.status !== 'Pending' && review.status !== 'Draft') {
    return next(new AppError(`Review cannot be started from ${review.status} status`, 400));
  }
  
  // Update the review status
  review.status = 'In Progress';
  review.startDate = new Date();
  
  await review.save();
  
  res.status(200).json({
    success: true,
    message: 'Review started successfully',
    review
  });
}));

module.exports = router;