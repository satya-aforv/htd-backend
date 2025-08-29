import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getLogs,
  getLog,
  createLog,
  updateLog,
  deleteLog,
} from '../controllers/employeeTravelLogController.js';

const router = express.Router();

const logValidation = [
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  body('loginTime').isISO8601().toDate().withMessage('Valid login time required'),
  body('startTime').isISO8601().toDate().withMessage('Valid start time required'),
  body('endTime').isISO8601().toDate().withMessage('Valid end time required'),
  body('workHours').isNumeric().withMessage('Work hours must be a number'),
  body('travelDuration').trim().notEmpty().withMessage('Travel duration required'),
  body('totalTravelWorkTime').trim().notEmpty().withMessage('Total travel + work time required'),
  body('otHours').optional().isNumeric().withMessage('OT hours must be a number'),
  body('startFrom').trim().notEmpty().withMessage('Start location required'),
  body('location').trim().notEmpty().withMessage('Destination required'),
  body('distanceKm').isNumeric().withMessage('Distance must be a number'),
  body('purpose').trim().notEmpty().withMessage('Purpose required'),
];

// List logs
router.get('/', authenticate, checkPermission('employeeTravelLogs', 'view'), getLogs);
// Get single log
router.get('/:id', authenticate, checkPermission('employeeTravelLogs', 'view'), getLog);
// Create log
router.post('/', authenticate, checkPermission('employeeTravelLogs', 'create'), logValidation, validate, createLog);
// Update log
router.put('/:id', authenticate, checkPermission('employeeTravelLogs', 'update'), logValidation, validate, updateLog);
// Delete log
router.delete('/:id', authenticate, checkPermission('employeeTravelLogs', 'delete'), deleteLog);

export default router; 