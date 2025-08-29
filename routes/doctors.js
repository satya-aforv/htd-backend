// server/routes/doctors.js - Fixed with proper multiple file support
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
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  deleteDoctorFile,
  addDoctorDocument,
  updateDoctorDocument,
  deleteDoctorDocument,
} from '../controllers/doctorController.js';

const router = express.Router();

// Validation rules for doctor
const doctorValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Doctor name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('gstNumber').trim().isLength({ min: 15, max: 15 }).withMessage('GST number must be exactly 15 characters'),
  body('panNumber').trim().isLength({ min: 10, max: 10 }).withMessage('PAN number must be exactly 10 characters'),
  body('gstAddress').trim().isLength({ min: 10 }).withMessage('GST address must be at least 10 characters'),
  body('city').trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Validation rules for doctor contact
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

// Doctor routes
router.get('/', authenticate, checkPermission('doctors', 'view'), getDoctors);
router.get('/:id', authenticate, checkPermission('doctors', 'view'), getDoctor);

// Create doctor with mixed file upload support (both single and multiple)
router.post('/', 
  authenticate, 
  checkPermission('doctors', 'create'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  doctorValidation, 
  validate, 
  createDoctor
);

// Update doctor with mixed file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('doctors', 'update'),
  uploadMixedFiles, // Support both single and multiple files
  handleUploadError,
  doctorValidation, 
  validate, 
  updateDoctor
);

router.delete('/:id', authenticate, checkPermission('doctors', 'delete'), deleteDoctor);

// Legacy file deletion (backward compatibility)
router.delete('/:id/file', authenticate, checkPermission('doctors', 'update'), deleteDoctorFile);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('doctors', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addDoctorDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('doctors', 'update'),
  documentValidation,
  validate,
  updateDoctorDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('doctors', 'update'), 
  deleteDoctorDocument
);

export default router;