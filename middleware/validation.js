import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// Password validation rules
export const passwordValidation = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

// Email validation
export const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

// Name validation
export const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Name must be between 2 and 100 characters')
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage('Name can only contain letters and spaces');

// MongoDB ObjectId validation
export const mongoIdValidation = (field = 'id') => 
  param(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    });

// Registration validation
export const validateRegistration = [
  nameValidation,
  emailValidation,
  passwordValidation,
  body('employeeNumber')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Employee number must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Employee number can only contain uppercase letters and numbers'),
  body('contactNumber')
    .trim()
    .matches(/^[+]?[\d\s\-()]{10,15}$/)
    .withMessage('Please provide a valid contact number'),
  body('designation')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  handleValidationErrors
];

// Login validation
export const validateLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  passwordValidation.withMessage('New password must meet security requirements'),
  handleValidationErrors
];

// Password reset validation
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  passwordValidation.withMessage('New password must meet security requirements'),
  handleValidationErrors
];

// Forgot password validation
export const validateForgotPassword = [
  emailValidation,
  handleValidationErrors
];

// Generic text field validation
export const validateTextField = (fieldName, minLength = 1, maxLength = 500) => [
  body(fieldName)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`)
    .escape(), // Prevent XSS
  handleValidationErrors
];

// Sanitize MongoDB query to prevent NoSQL injection
export const sanitizeQuery = (query) => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    // Remove operators that could be used for injection
    if (key.startsWith('$')) {
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// File upload validation
export const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const files = req.files || [req.file];
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt'];
  
  for (const file of files) {
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        message: `Invalid file extension: ${fileExtension}. Allowed: ${allowedExtensions.join(', ')}` 
      });
    }
    
    // Check for path traversal attempts
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return res.status(400).json({ message: 'Invalid filename detected' });
    }
  }
  
  next();
};
