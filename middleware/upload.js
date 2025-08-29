// server/middleware/upload.js - Updated for multiple file support
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const hospitalDocsDir = path.join(uploadsDir, 'hospital-documents');
const doctorDocsDir = path.join(uploadsDir, 'doctor-documents');


if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(hospitalDocsDir)) {
  fs.mkdirSync(hospitalDocsDir, { recursive: true });
  
}
if (!fs.existsSync(doctorDocsDir)) {
  fs.mkdirSync(doctorDocsDir, { recursive: true });
}


// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, hospitalDocsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, and TXT files are allowed.'), false);
  }
  
  // Check file extension
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error(`Invalid file extension: ${fileExtension}`), false);
  }
  
  // Check for path traversal attempts
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error('Invalid filename detected'), false);
  }
  
  // Check filename length
  if (file.originalname.length > 255) {
    return cb(new Error('Filename too long'), false);
  }
  
  cb(null, true);
};

// Configure multer for single file upload
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Configure multer for multiple file upload
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files
  }
});

// Middleware for single file upload (backward compatibility)
export const uploadSingleFile = uploadSingle.single('agreementFile');

// Middleware for multiple file upload
export const uploadMultipleFiles = uploadMultiple.array('documents', 10);

// Middleware for mixed upload (single + multiple)
export const uploadMixedFiles = uploadMultiple.fields([
  { name: 'agreementFile', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]);

// Middleware for adding single document
export const uploadDocument = uploadSingle.single('document');

// Error handler middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB per file.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'Too many files. Maximum 10 files allowed.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'Unexpected file field.' 
      });
    }
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  
  return res.status(500).json({ 
    message: 'File upload error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

export default {
  uploadSingle: uploadSingleFile,
  uploadMultiple: uploadMultipleFiles,
  uploadMixed: uploadMixedFiles,
  uploadDocument: uploadDocument,
  handleError: handleUploadError
};