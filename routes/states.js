import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getStates,
  getState,
  createState,
  updateState,
  deleteState,
} from '../controllers/stateController.js';

const router = express.Router();

// Validation rules
const stateValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('code').trim().isLength({ min: 2, max: 5 }).withMessage('Code must be 2-5 characters'),
  body('country').trim().isLength({ min: 2 }).withMessage('Country must be at least 2 characters'),
  body('population').optional().isInt({ min: 0 }).withMessage('Population must be a positive number'),
  body('area').optional().isFloat({ min: 0 }).withMessage('Area must be a positive number'),
  body('capital').optional().trim().isLength({ min: 1 }).withMessage('Capital must not be empty'),
];

// Routes
router.get('/', authenticate, checkPermission('states', 'view'), getStates);
router.get('/:id', authenticate, checkPermission('states', 'view'), getState);
router.post('/', authenticate, checkPermission('states', 'create'), stateValidation, validate, createState);
router.put('/:id', authenticate, checkPermission('states', 'update'), stateValidation, validate, updateState);
router.delete('/:id', authenticate, checkPermission('states', 'delete'), deleteState);

export default router;