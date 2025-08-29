// server/controllers/doctorController.js - Fixed file handling
import Doctor from '../models/Doctor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ]
    } : {};
    
    const doctors = await Doctor.find(query)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Doctor.countDocuments(query);
    
    res.json({
      doctors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
};

export const getDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('agreementFile.uploadedBy', 'name email');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({
      doctor,
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Failed to fetch doctor' });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      gstAddress,
      city,
      state,
      pincode
    } = req.body;
    
    // Check if GST number already exists
    const existingGST = await Doctor.findOne({ gstNumber });
    if (existingGST) {
      return res.status(400).json({ message: 'Doctor with this GST number already exists' });
    }
    
    // Check if PAN number already exists
    const existingPAN = await Doctor.findOne({ panNumber });
    if (existingPAN) {
      return res.status(400).json({ message: 'Doctor with this PAN number already exists' });
    }
    
    const doctorData = {
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      gstAddress,
      city,
      state,
      pincode,
      createdBy: req.user._id,
      documents: []
    };
    
    // Handle file uploads from multer
    console.log('Files received:', req.files);
    console.log('File fields:', req.file);
    console.log('Body:', req.body);
    
    // Handle multiple documents
    if (req.files && req.files.documents) {
      const documentsFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      const fileTypes = req.body.fileTypes ? 
        (Array.isArray(req.body.fileTypes) ? req.body.fileTypes : [req.body.fileTypes]) : 
        [];
      
      const descriptions = req.body.descriptions ? 
        (Array.isArray(req.body.descriptions) ? req.body.descriptions : [req.body.descriptions]) : 
        [];
      
      doctorData.documents = documentsFiles.map((file, index) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType: fileTypes[index] || 'other',
        description: descriptions[index] || '',
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
    }
    
    // Handle single agreement file (legacy support)
    if (req.files && req.files.agreementFile && req.files.agreementFile[0]) {
      const file = req.files.agreementFile[0];
      doctorData.agreementFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };
    }
    
    const doctor = new Doctor(doctorData);
    await doctor.save();
    await doctor.populate('state', 'name code');
    await doctor.populate('createdBy', 'name email');
    await doctor.populate('documents.uploadedBy', 'name email');
    
    res.status(201).json({
      message: 'Doctor created successfully',
      doctor,
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    
    // Clean up uploaded files if doctor creation fails
    if (req.files) {
      // Clean up documents
      if (req.files.documents) {
        const files = Array.isArray(req.files.documents) ? req.files.documents : [req.files.documents];
        files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error deleting uploaded file:', unlinkError);
          }
        });
      }
      
      // Clean up agreement file
      if (req.files.agreementFile && req.files.agreementFile[0]) {
        try {
          fs.unlinkSync(req.files.agreementFile[0].path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({ message: 'Failed to create doctor' });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      gstAddress,
      city,
      state,
      pincode,
      isActive
    } = req.body;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if GST number already exists (excluding current doctor)
    if (gstNumber !== doctor.gstNumber) {
      const existingGST = await Doctor.findOne({ gstNumber, _id: { $ne: id } });
      if (existingGST) {
        return res.status(400).json({ message: 'Doctor with this GST number already exists' });
      }
    }
    
    // Check if PAN number already exists (excluding current doctor)
    if (panNumber !== doctor.panNumber) {
      const existingPAN = await Doctor.findOne({ panNumber, _id: { $ne: id } });
      if (existingPAN) {
        return res.status(400).json({ message: 'Doctor with this PAN number already exists' });
      }
    }
    
    // Update fields
    doctor.name = name;
    doctor.email = email;
    doctor.phone = phone;
    doctor.gstNumber = gstNumber;
    doctor.panNumber = panNumber;
    doctor.gstAddress = gstAddress;
    doctor.city = city;
    doctor.state = state;
    doctor.pincode = pincode;
    doctor.isActive = isActive;
    doctor.updatedBy = req.user._id;
    
    // Handle new file uploads
    console.log('Update - Files received:', req.files);
    console.log('Update - Body:', req.body);
    
    // Handle multiple documents
    if (req.files && req.files.documents) {
      const documentsFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      const fileTypes = req.body.fileTypes ? 
        (Array.isArray(req.body.fileTypes) ? req.body.fileTypes : [req.body.fileTypes]) : 
        [];
      
      const descriptions = req.body.descriptions ? 
        (Array.isArray(req.body.descriptions) ? req.body.descriptions : [req.body.descriptions]) : 
        [];
      
      const newDocuments = documentsFiles.map((file, index) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType: fileTypes[index] || 'other',
        description: descriptions[index] || '',
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
      
      doctor.documents.push(...newDocuments);
    }
    
    // Handle single agreement file (legacy support)
    if (req.files && req.files.agreementFile && req.files.agreementFile[0]) {
      const file = req.files.agreementFile[0];
      const oldFile = doctor.agreementFile?.filename;
      
      // Delete old file if it exists
      if (oldFile) {
        const oldFilePath = path.join(__dirname, '../uploads/doctor-documents', oldFile);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old file:', deleteError);
        }
      }
      
      // Set new file info
      doctor.agreementFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };
    }
    
    await doctor.save();
    await doctor.populate('state', 'name code');
    await doctor.populate('createdBy', 'name email');
    await doctor.populate('updatedBy', 'name email');
    await doctor.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Doctor updated successfully',
      doctor,
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    
    // Clean up uploaded files if update fails
    if (req.files) {
      // Clean up documents
      if (req.files.documents) {
        const files = Array.isArray(req.files.documents) ? req.files.documents : [req.files.documents];
        files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error deleting uploaded file:', unlinkError);
          }
        });
      }
      
      // Clean up agreement file
      if (req.files.agreementFile && req.files.agreementFile[0]) {
        try {
          fs.unlinkSync(req.files.agreementFile[0].path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({ message: 'Failed to update doctor' });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Delete all associated files
    if (doctor.documents && doctor.documents.length > 0) {
      doctor.documents.forEach(doc => {
        const filePath = path.join(__dirname, '../uploads/doctor-documents', doc.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting doctor document:', deleteError);
        }
      });
    }
    
    // Delete legacy agreement file
    if (doctor.agreementFile?.filename) {
      const filePath = path.join(__dirname, '../uploads/doctor-documents', doctor.agreementFile.filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteError) {
        console.error('Error deleting doctor file:', deleteError);
      }
    }
    
    await Doctor.findByIdAndDelete(id);
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Failed to delete doctor' });
  }
};

// Add a new document to doctor
export const addDoctorDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType, description } = req.body;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const documentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fileType: fileType || 'other',
      description: description || '',
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };
    
    await doctor.addDocument(documentData);
    await doctor.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Document added successfully',
      document: doctor.documents[doctor.documents.length - 1]
    });
  } catch (error) {
    console.error('Add doctor document error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Failed to add document' });
  }
};

// Update doctor document metadata
export const updateDoctorDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { fileType, description } = req.body;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const document = doctor.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.fileType = fileType || document.fileType;
    document.description = description || document.description;
    
    await doctor.save();
    await doctor.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Update doctor document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

// Delete doctor document
export const deleteDoctorDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const document = doctor.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/doctor-documents', document.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
    
    // Remove document from array
    doctor.documents.id(documentId).remove();
    await doctor.save();
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete doctor document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Legacy file deletion (backward compatibility)
export const deleteDoctorFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    if (!doctor.agreementFile?.filename) {
      return res.status(404).json({ message: 'No file found for this doctor' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/doctor-documents', doctor.agreementFile.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
      return res.status(500).json({ message: 'Failed to delete file from storage' });
    }
    
    // Remove file info from database
    doctor.agreementFile = {
      filename: null,
      originalName: null,
      mimetype: null,
      size: null,
      uploadedAt: null,
      uploadedBy: null
    };
    doctor.updatedBy = req.user._id;
    await doctor.save();
    
    res.json({ message: 'Doctor file deleted successfully' });
  } catch (error) {
    console.error('Delete doctor file error:', error);
    res.status(500).json({ message: 'Failed to delete doctor file' });
  }
};