// server/routes/files.js - Fixed upload middleware import
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { uploadSingleFile, handleUploadError } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Upload file endpoint
router.post('/upload', authenticate, checkPermission('files', 'create'), uploadSingleFile, handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/api/files/download/${req.file.filename}`
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// Download file endpoint
router.get('/download/:filename', authenticate, checkPermission('files', 'view'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/hospital-documents', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats for metadata
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'File download failed' });
  }
});

// View file endpoint (for browser viewing)
router.get('/view/:filename', authenticate, checkPermission('files', 'view'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/hospital-documents', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileExtension = path.extname(filename).toLowerCase();
    
    // Set appropriate content type for viewing
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      default:
        // For other file types, force download
        return res.redirect(`/api/files/download/${filename}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set headers for inline viewing
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache for viewing
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File view error:', error);
    res.status(500).json({ message: 'File view failed' });
  }
});

// Delete file endpoint
router.delete('/:filename', authenticate, checkPermission('files', 'delete'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/hospital-documents', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ message: 'File deletion failed' });
  }
});

// List files endpoint (for admin)
router.get('/', authenticate, checkPermission('files', 'view'), (req, res) => {
  try {
    const hospitalDocsDir = path.join(__dirname, '../uploads/hospital-documents');
    
    if (!fs.existsSync(hospitalDocsDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(hospitalDocsDir).map(filename => {
      const filePath = path.join(hospitalDocsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        downloadUrl: `/api/files/download/${filename}`,
        viewUrl: `/api/files/view/${filename}`
      };
    });

    res.json({ files });
    
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ message: 'Failed to list files' });
  }
});

export default router;