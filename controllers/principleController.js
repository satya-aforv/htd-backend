import Principle from '../models/Principle.js';
import PrincipleContact from '../models/PrincipleContact.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getPrinciples = async (req, res) => {
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
    const principles = await Principle.find(query)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    // Fetch contacts count for each principle from PrincipleContact collection
    const principleIds = principles.map(p => p._id);
    const contactsByPrinciple = await PrincipleContact.aggregate([
      { $match: { principle: { $in: principleIds } } },
      { $group: { _id: '$principle', count: { $sum: 1 } } }
    ]);
    const contactsCountMap = {};
    contactsByPrinciple.forEach(c => { contactsCountMap[c._id.toString()] = c.count; });
    principles.forEach(p => {
      p.contactsCount = contactsCountMap[p._id.toString()] || 0;
    });
    const total = await Principle.countDocuments(query);
    res.json({
      principles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get principles error:', error);
    res.status(500).json({ message: 'Failed to fetch principles' });
  }
};

export const getPrinciple = async (req, res) => {
  try {
    const { id } = req.params;
    const principle = await Principle.findById(id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('agreementFile.uploadedBy', 'name email');
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    const contacts = await PrincipleContact.find({ principle: id })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({
      principle,
      contacts,
    });
  } catch (error) {
    console.error('Get principle error:', error);
    res.status(500).json({ message: 'Failed to fetch principle' });
  }
};

export const createPrinciple = async (req, res) => {
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
    const existingGST = await Principle.findOne({ gstNumber });
    if (existingGST) {
      return res.status(400).json({ message: 'Principle with this GST number already exists' });
    }
    const existingPAN = await Principle.findOne({ panNumber });
    if (existingPAN) {
      return res.status(400).json({ message: 'Principle with this PAN number already exists' });
    }
    const principleData = {
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
      principleData.documents = documentsFiles.map((file, index) => ({
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
    if (req.files && req.files.agreementFile && req.files.agreementFile[0]) {
      const file = req.files.agreementFile[0];
      principleData.agreementFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };
    }
    const principle = new Principle(principleData);
    await principle.save();
    await principle.populate('state', 'name code');
    await principle.populate('createdBy', 'name email');
    await principle.populate('documents.uploadedBy', 'name email');
    res.status(201).json({
      message: 'Principle created successfully',
      principle,
    });
  } catch (error) {
    console.error('Create principle error:', error);
    if (req.files) {
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
      if (req.files.agreementFile && req.files.agreementFile[0]) {
        try {
          fs.unlinkSync(req.files.agreementFile[0].path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
    }
    res.status(500).json({ message: 'Failed to create principle' });
  }
};

export const updatePrinciple = async (req, res) => {
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
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    if (gstNumber !== principle.gstNumber) {
      const existingGST = await Principle.findOne({ gstNumber, _id: { $ne: id } });
      if (existingGST) {
        return res.status(400).json({ message: 'Principle with this GST number already exists' });
      }
    }
    if (panNumber !== principle.panNumber) {
      const existingPAN = await Principle.findOne({ panNumber, _id: { $ne: id } });
      if (existingPAN) {
        return res.status(400).json({ message: 'Principle with this PAN number already exists' });
      }
    }
    principle.name = name;
    principle.email = email;
    principle.phone = phone;
    principle.gstNumber = gstNumber;
    principle.panNumber = panNumber;
    principle.gstAddress = gstAddress;
    principle.city = city;
    principle.state = state;
    principle.pincode = pincode;
    principle.isActive = isActive;
    principle.updatedBy = req.user._id;
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
      principle.documents.push(...newDocuments);
    }
    if (req.files && req.files.agreementFile && req.files.agreementFile[0]) {
      const file = req.files.agreementFile[0];
      const oldFile = principle.agreementFile?.filename;
      if (oldFile) {
        const oldFilePath = path.join(__dirname, '../uploads/hospital-documents', oldFile);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old file:', deleteError);
        }
      }
      principle.agreementFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };
    }
    await principle.save();
    await principle.populate('state', 'name code');
    await principle.populate('createdBy', 'name email');
    await principle.populate('updatedBy', 'name email');
    await principle.populate('documents.uploadedBy', 'name email');
    res.json({
      message: 'Principle updated successfully',
      principle,
    });
  } catch (error) {
    console.error('Update principle error:', error);
    if (req.files) {
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
      if (req.files.agreementFile && req.files.agreementFile[0]) {
        try {
          fs.unlinkSync(req.files.agreementFile[0].path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
    }
    res.status(500).json({ message: 'Failed to update principle' });
  }
};

export const deletePrinciple = async (req, res) => {
  try {
    const { id } = req.params;
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    const contactsCount = await PrincipleContact.countDocuments({ principle: id });
    if (contactsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete principle. It has ${contactsCount} contact(s) associated with it. Please delete all contacts first.` 
      });
    }
    if (principle.documents && principle.documents.length > 0) {
      principle.documents.forEach(doc => {
        const filePath = path.join(__dirname, '../uploads/hospital-documents', doc.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting principle document:', deleteError);
        }
      });
    }
    if (principle.agreementFile?.filename) {
      const filePath = path.join(__dirname, '../uploads/hospital-documents', principle.agreementFile.filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteError) {
        console.error('Error deleting principle file:', deleteError);
      }
    }
    await Principle.findByIdAndDelete(id);
    res.json({ message: 'Principle deleted successfully' });
  } catch (error) {
    console.error('Delete principle error:', error);
    res.status(500).json({ message: 'Failed to delete principle' });
  }
};

export const addPrincipleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType, description } = req.body;
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
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
    await principle.addDocument(documentData);
    await principle.populate('documents.uploadedBy', 'name email');
    res.json({
      message: 'Document added successfully',
      document: principle.documents[principle.documents.length - 1]
    });
  } catch (error) {
    console.error('Add principle document error:', error);
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

export const updatePrincipleDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { fileType, description } = req.body;
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    const document = principle.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    document.fileType = fileType || document.fileType;
    document.description = description || document.description;
    await principle.save();
    await principle.populate('documents.uploadedBy', 'name email');
    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Update principle document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

export const deletePrincipleDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    const document = principle.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    const filePath = path.join(__dirname, '../uploads/hospital-documents', document.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
    principle.documents.id(documentId).remove();
    await principle.save();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete principle document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

export const deletePrincipleFile = async (req, res) => {
  try {
    const { id } = req.params;
    const principle = await Principle.findById(id);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    if (!principle.agreementFile?.filename) {
      return res.status(404).json({ message: 'No file found for this principle' });
    }
    const filePath = path.join(__dirname, '../uploads/hospital-documents', principle.agreementFile.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
      return res.status(500).json({ message: 'Failed to delete file from storage' });
    }
    principle.agreementFile = {
      filename: null,
      originalName: null,
      mimetype: null,
      size: null,
      uploadedAt: null,
      uploadedBy: null
    };
    principle.updatedBy = req.user._id;
    await principle.save();
    res.json({ message: 'Principle file deleted successfully' });
  } catch (error) {
    console.error('Delete principle file error:', error);
    res.status(500).json({ message: 'Failed to delete principle file' });
  }
};

export const getPrincipleContacts = async (req, res) => {
  try {
    const { principleId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = {
      principle: principleId,
      ...(search && {
        $or: [
          { departmentName: { $regex: search, $options: 'i' } },
          { personName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ]
      })
    };
    const contacts = await PrincipleContact.find(query)
      .populate('principle', 'name')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await PrincipleContact.countDocuments(query);
    res.json({
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get principle contacts error:', error);
    res.status(500).json({ message: 'Failed to fetch principle contacts' });
  }
};

export const createPrincipleContact = async (req, res) => {
  try {
    const { principleId } = req.params;
    const {
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode
    } = req.body;
    const principle = await Principle.findById(principleId);
    if (!principle) {
      return res.status(404).json({ message: 'Principle not found' });
    }
    const contact = new PrincipleContact({
      principle: principleId,
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode,
      createdBy: req.user._id,
    });
    await contact.save();
    await contact.populate('principle', 'name');
    await contact.populate('createdBy', 'name email');
    res.status(201).json({
      message: 'Principle contact created successfully',
      contact,
    });
  } catch (error) {
    console.error('Create principle contact error:', error);
    res.status(500).json({ message: 'Failed to create principle contact' });
  }
};

export const updatePrincipleContact = async (req, res) => {
  try {
    const { principleId, contactId } = req.params;
    const {
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode,
      isActive
    } = req.body;
    const contact = await PrincipleContact.findOne({ _id: contactId, principle: principleId });
    if (!contact) {
      return res.status(404).json({ message: 'Principle contact not found' });
    }
    contact.departmentName = departmentName;
    contact.personName = personName;
    contact.email = email;
    contact.phone = phone;
    contact.address = address;
    contact.location = location;
    contact.pincode = pincode;
    contact.isActive = isActive;
    contact.updatedBy = req.user._id;
    await contact.save();
    await contact.populate('principle', 'name');
    await contact.populate('createdBy', 'name email');
    await contact.populate('updatedBy', 'name email');
    res.json({
      message: 'Principle contact updated successfully',
      contact,
    });
  } catch (error) {
    console.error('Update principle contact error:', error);
    res.status(500).json({ message: 'Failed to update principle contact' });
  }
};

export const deletePrincipleContact = async (req, res) => {
  try {
    const { principleId, contactId } = req.params;
    const contact = await PrincipleContact.findOne({ _id: contactId, principle: principleId });
    if (!contact) {
      return res.status(404).json({ message: 'Principle contact not found' });
    }
    await PrincipleContact.findByIdAndDelete(contactId);
    res.json({ message: 'Principle contact deleted successfully' });
  } catch (error) {
    console.error('Delete principle contact error:', error);
    res.status(500).json({ message: 'Failed to delete principle contact' });
  }
}; 