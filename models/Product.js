
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  supplierName: {
    type: String,
    required: true,
    trim: true,
  },
  productCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  principle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principle',
    required: true,
  },
  dp: {
    type: Number,
    required: true,
  },
  mrp: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
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

export default mongoose.model('Product', productSchema);
