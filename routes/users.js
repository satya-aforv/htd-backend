import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
} from '../controllers/userController.js';

const router = express.Router();

// Validation rules
const userValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
  body('employeeNumber').trim().notEmpty().withMessage('Employee Number is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact Number is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
];

const createUserValidation = [
  ...userValidation,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const updateUserValidation = [
  ...userValidation,
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const permissionsValidation = [
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('permissions.*').isMongoId().withMessage('Each permission must be a valid ID'),
];

// Routes
router.get('/', authenticate, checkPermission('users', 'view'), getUsers);
router.get('/:id', authenticate, checkPermission('users', 'view'), getUser);
router.post('/', authenticate, checkPermission('users', 'create'), createUserValidation, validate, createUser);
router.put('/:id', authenticate, checkPermission('users', 'update'), updateUserValidation, validate, updateUser);
router.delete('/:id', authenticate, checkPermission('users', 'delete'), deleteUser);

// Permission management routes
router.get('/:id/permissions', authenticate, checkPermission('users', 'view'), getUserPermissions);
router.put('/:id/permissions', authenticate, checkPermission('users', 'update'), permissionsValidation, validate, updateUserPermissions);

export default router;