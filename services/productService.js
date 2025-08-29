
import Product from '../models/Product.js';

export const getProducts = async (query, page, limit) => {
  const products = await Product.find(query)
    .populate('principle', 'name')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Product.countDocuments(query);
  
  return { products, total };
};

export const getProductById = async (id) => {
  return await Product.findById(id)
    .populate('principle', 'name')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
};

export const createProduct = async (productData) => {
  const existingCode = await Product.findOne({ productCode: productData.productCode });
  if (existingCode) {
    const error = new Error('Product with this code already exists');
    error.statusCode = 400;
    throw error;
  }
  
  const product = new Product(productData);
  await product.save();
  await product.populate('principle', 'name');
  await product.populate('createdBy', 'name email');
  return product;
};

export const updateProduct = async (id, productData) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  
  if (productData.productCode && productData.productCode !== product.productCode) {
    const existingCode = await Product.findOne({ productCode: productData.productCode, _id: { $ne: id } });
    if (existingCode) {
      const error = new Error('Product with this code already exists');
      error.statusCode = 400;
      throw error;
    }
  }
  
  Object.assign(product, productData);
  
  await product.save();
  await product.populate('principle', 'name');
  await product.populate('createdBy', 'name email');
  await product.populate('updatedBy', 'name email');
  
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  
  await Product.findByIdAndDelete(id);
};
