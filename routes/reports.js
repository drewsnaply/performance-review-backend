// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/performance', reportsController.getPerformanceReport);
router.get('/completion', reportsController.getCompletionReport);
router.get('/distribution', reportsController.getDistributionReport);
router.get('/trends', reportsController.getTrendsReport);
router.get('/comparison', reportsController.getComparisonReport);
router.get('/custom', reportsController.getCustomReport);

module.exports = router;