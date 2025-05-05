// backend/controllers/reportsController.js

// Performance metrics report
exports.getPerformanceReport = async (req, res) => {
    try {
      // For quick testing, return mock data
      const performanceData = [
        { department: 'Engineering', averageScore: 4.2, completionRate: 0.85, onTimeRate: 0.76 },
        { department: 'Marketing', averageScore: 3.9, completionRate: 0.92, onTimeRate: 0.88 },
        { department: 'Sales', averageScore: 4.0, completionRate: 0.79, onTimeRate: 0.72 },
        { department: 'HR', averageScore: 4.5, completionRate: 0.95, onTimeRate: 0.91 },
        { department: 'Finance', averageScore: 3.8, completionRate: 0.88, onTimeRate: 0.82 }
      ];
      
      res.json({ performanceData });
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ error: 'Failed to generate performance report' });
    }
  };
  
  // Simple mock implementations for other report types
  exports.getCompletionReport = async (req, res) => {
    const completionData = [
      { department: 'Engineering', completed: 45, pending: 12, overdue: 3 },
      { department: 'Marketing', completed: 28, pending: 5, overdue: 1 },
      { department: 'Sales', completed: 37, pending: 15, overdue: 6 },
      { department: 'HR', completed: 22, pending: 3, overdue: 0 },
      { department: 'Finance', completed: 18, pending: 7, overdue: 2 }
    ];
    
    res.json({ completionData });
  };
  
  exports.getDistributionReport = async (req, res) => {
    const distributionData = [
      { range: '0-1', count: 5 },
      { range: '1-2', count: 12 },
      { range: '2-3', count: 25 },
      { range: '3-4', count: 38 },
      { range: '4-5', count: 20 }
    ];
    
    res.json({ distributionData });
  };
  
  exports.getTrendsReport = async (req, res) => {
    const trendsData = [
      { date: 'Jan', averageScore: 3.8, completionRate: 0.73, onTimeRate: 0.65 },
      { date: 'Feb', averageScore: 3.9, completionRate: 0.75, onTimeRate: 0.68 },
      { date: 'Mar', averageScore: 4.0, completionRate: 0.78, onTimeRate: 0.72 },
      { date: 'Apr', averageScore: 4.1, completionRate: 0.82, onTimeRate: 0.75 },
      { date: 'May', averageScore: 4.2, completionRate: 0.85, onTimeRate: 0.79 },
      { date: 'Jun', averageScore: 4.3, completionRate: 0.87, onTimeRate: 0.82 }
    ];
    
    res.json({ trendsData });
  };
  
  exports.getComparisonReport = async (req, res) => {
    const comparisonData = [
      { department: 'Engineering', currentScore: 4.2, previousScore: 3.9 },
      { department: 'Marketing', currentScore: 3.9, previousScore: 3.7 },
      { department: 'Sales', currentScore: 4.0, previousScore: 3.8 },
      { department: 'HR', currentScore: 4.5, previousScore: 4.3 },
      { department: 'Finance', currentScore: 3.8, previousScore: 3.9 }
    ];
    
    res.json({ comparisonData });
  };
  
  exports.getCustomReport = async (req, res) => {
    const customData = [
      { name: 'Metric 1', value1: 45, value2: 32, value3: 78 },
      { name: 'Metric 2', value1: 56, value2: 24, value3: 65 },
      { name: 'Metric 3', value1: 38, value2: 27, value3: 92 },
      { name: 'Metric 4', value1: 62, value2: 45, value3: 84 },
      { name: 'Metric 5', value1: 52, value2: 36, value3: 79 }
    ];
    
    res.json({ customData });
  };