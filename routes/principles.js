import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  uploadSingleFile, 
  uploadMultipleFiles, 
  uploadMixedFiles,
  uploadDocument, 
  handleUploadError 
} from '../middleware/upload.js';
import {
  getPrinciples,
  getPrinciple,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  deletePrincipleFile,
  addPrincipleDocument,
  updatePrincipleDocument,
  deletePrincipleDocument,
  getPrincipleContacts,
  createPrincipleContact,
  updatePrincipleContact,
  deletePrincipleContact,
} from '../controllers/principleController.js';

const router = express.Router();

// Validation rules for principle
const principleValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Principle name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('gstNumber').trim().isLength({ min: 15, max: 15 }).withMessage('GST number must be exactly 15 characters'),
  body('panNumber').optional({ checkFalsy: true }).trim().isLength({ min: 10, max: 10 }).withMessage('PAN number must be exactly 10 characters'),
  body('gstAddress').optional({ checkFalsy: true }).trim().isLength({ min: 10 }).withMessage('GST address must be at least 10 characters'),
  body('city').trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Validation rules for principle contact
const contactValidation = [
  body('departmentName').trim().isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
  body('personName').trim().isLength({ min: 2 }).withMessage('Person name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('address').trim().isLength({ min: 10 }).withMessage('Address must be at least 10 characters'),
  body('location').trim().isLength({ min: 2 }).withMessage('Location must be at least 2 characters'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Document validation
const documentValidation = [
  body('fileType').optional().isIn(['agreement', 'license', 'certificate', 'other']).withMessage('Invalid file type'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
];

// Principle routes
router.get('/', authenticate, checkPermission('principles', 'view'), getPrinciples);
router.get('/:id', authenticate, checkPermission('principles', 'view'), getPrinciple);

// Create principle with mixed file upload support (both single and multiple)
router.post('/', 
  authenticate, 
  checkPermission('principles', 'create'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  principleValidation, 
  validate, 
  createPrinciple
);

// Update principle with mixed file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('principles', 'update'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  principleValidation, 
  validate, 
  updatePrinciple
);

router.delete('/:id', authenticate, checkPermission('principles', 'delete'), deletePrinciple);

// Legacy file deletion (backward compatibility)
router.delete('/:id/file', authenticate, checkPermission('principles', 'update'), deletePrincipleFile);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('principles', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addPrincipleDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('principles', 'update'),
  documentValidation,
  validate,
  updatePrincipleDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('principles', 'update'), 
  deletePrincipleDocument
);

// Principle contacts routes
router.get('/:principleId/contacts', authenticate, checkPermission('principles', 'view'), getPrincipleContacts);
router.post('/:principleId/contacts', authenticate, checkPermission('principles', 'update'), contactValidation, validate, createPrincipleContact);
router.put('/:principleId/contacts/:contactId', authenticate, checkPermission('principles', 'update'), contactValidation, validate, updatePrincipleContact);
router.delete('/:principleId/contacts/:contactId', authenticate, checkPermission('principles', 'update'), deletePrincipleContact);

export default router; 