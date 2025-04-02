// errorHandler.js
const winston = require('winston');

// Create a logger with multiple transports
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'performance-review-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware to handle async route errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.status || 'Error'}: ${err.message}`, {
    error: err,
    requestBody: req.body,
    requestParams: req.params,
    requestQuery: req.query,
    requestPath: req.path,
    requestMethod: req.method
  });

  // Determine status code and message
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  
  // Detailed error response in development
  const errorResponse = process.env.NODE_ENV === 'development' 
    ? {
        status,
        message: err.message,
        stack: err.stack,
        error: err
      }
    : {
        status,
        message: err.isOperational ? err.message : 'Something went wrong'
      };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Unhandled route middleware
const unhandledRouteHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server`, 404);
  next(err);
};

module.exports = {
  AppError,
  catchAsync,
  globalErrorHandler,
  unhandledRouteHandler,
  logger
};