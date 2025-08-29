import mongoose from 'mongoose';

const principleContactSchema = new mongoose.Schema({
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true,
  },
  departmentName: {
    type: String,
    required: true,
    trim: true,
  },
  personName: {
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
  address: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
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

principleContactSchema.index({ principle: 1, departmentName: 1 });
principleContactSchema.index({ personName: 'text', email: 'text' });

export default mongoose.model('PrincipleContact', principleContactSchema); 