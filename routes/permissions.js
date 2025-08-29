import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionStats,
} from '../controllers/permissionController.js';

const router = express.Router();

// Validation rules
const permissionValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').trim().isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('resource').trim().isLength({ min: 2 }).withMessage('Resource must be at least 2 characters'),
  body('action').isIn(['view', 'create', 'update', 'delete']).withMessage('Action must be view, create, update, or delete'),
];

// Routes
router.get('/', authenticate, getPermissions);
router.get('/stats', authenticate, checkPermission('users', 'view'), getPermissionStats);
router.get('/:id', authenticate, getPermission);
router.post('/', authenticate, checkPermission('users', 'create'), permissionValidation, validate, createPermission);
router.put('/:id', authenticate, checkPermission('users', 'update'), permissionValidation, validate, updatePermission);
router.delete('/:id', authenticate, checkPermission('users', 'delete'), deletePermission);

export default router;