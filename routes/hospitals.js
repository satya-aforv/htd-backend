// server/routes/hospitals.js - Fixed with proper multiple file support
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
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  deleteHospitalFile,
  addHospitalDocument,
  updateHospitalDocument,
  deleteHospitalDocument,
  getHospitalContacts,
  createHospitalContact,
  updateHospitalContact,
  deleteHospitalContact,
} from '../controllers/hospitalController.js';

const router = express.Router();

// Validation rules for hospital
const hospitalValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Hospital name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('gstNumber').trim().isLength({ min: 15, max: 15 }).withMessage('GST number must be exactly 15 characters'),
  body('panNumber').trim().isLength({ min: 10, max: 10 }).withMessage('PAN number must be exactly 10 characters'),
  body('gstAddress').trim().isLength({ min: 10 }).withMessage('GST address must be at least 10 characters'),
  body('city').trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Validation rules for hospital contact
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

// Hospital routes
router.get('/', authenticate, checkPermission('hospitals', 'view'), getHospitals);
router.get('/:id', authenticate, checkPermission('hospitals', 'view'), getHospital);

// Create hospital with mixed file upload support (both single and multiple)
router.post('/', 
  authenticate, 
  checkPermission('hospitals', 'create'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  hospitalValidation, 
  validate, 
  createHospital
);

// Update hospital with mixed file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('hospitals', 'update'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  hospitalValidation, 
  validate, 
  updateHospital
);

router.delete('/:id', authenticate, checkPermission('hospitals', 'delete'), deleteHospital);

// Legacy file deletion (backward compatibility)
router.delete('/:id/file', authenticate, checkPermission('hospitals', 'update'), deleteHospitalFile);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('hospitals', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addHospitalDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('hospitals', 'update'),
  documentValidation,
  validate,
  updateHospitalDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('hospitals', 'update'), 
  deleteHospitalDocument
);

// Hospital contacts routes
router.get('/:hospitalId/contacts', authenticate, checkPermission('hospitals', 'view'), getHospitalContacts);
router.post('/:hospitalId/contacts', authenticate, checkPermission('hospitals', 'update'), contactValidation, validate, createHospitalContact);
router.put('/:hospitalId/contacts/:contactId', authenticate, checkPermission('hospitals', 'update'), contactValidation, validate, updateHospitalContact);
router.delete('/:hospitalId/contacts/:contactId', authenticate, checkPermission('hospitals', 'update'), deleteHospitalContact);

export default router;