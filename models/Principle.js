// server/models/Principle.js - Based on Hospital.js
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['agreement', 'license', 'certificate', 'other'],
    default: 'other',
  },
  description: {
    type: String,
    trim: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { _id: true });

const principleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  gstNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  panNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
  },
  documents: [fileSchema],
  agreementFile: {
    filename: {
      type: String,
      default: null,
    },
    originalName: {
      type: String,
      default: null,
    },
    mimetype: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    }
  },
  gstAddress: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

principleSchema.index({ name: 'text', email: 'text', gstNumber: 'text' });

principleSchema.virtual('documentsCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

principleSchema.virtual('documentUrls').get(function() {
  if (!this.documents || this.documents.length === 0) return [];
  return this.documents.map(doc => ({
    ...doc.toObject(),
    downloadUrl: `/api/files/download/${doc.filename}`,
    viewUrl: `/api/files/view/${doc.filename}`
  }));
});

principleSchema.virtual('agreementFileUrl').get(function() {
  if (this.agreementFile && this.agreementFile.filename) {
    return `/api/files/download/${this.agreementFile.filename}`;
  }
  return null;
});

principleSchema.virtual('agreementFileViewUrl').get(function() {
  if (this.agreementFile && this.agreementFile.filename) {
    return `/api/files/view/${this.agreementFile.filename}`;
  }
  return null;
});

principleSchema.set('toJSON', { virtuals: true });
principleSchema.set('toObject', { virtuals: true });

principleSchema.methods.addDocument = function(fileData) {
  this.documents.push(fileData);
  return this.save();
};

principleSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

principleSchema.methods.updateDocument = function(documentId, updateData) {
  const document = this.documents.id(documentId);
  if (document) {
    Object.assign(document, updateData);
    return this.save();
  }
  throw new Error('Document not found');
};

export default mongoose.model('Principle', principleSchema); 