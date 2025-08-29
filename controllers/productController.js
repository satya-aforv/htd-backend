import * as productService from '../services/productService.js';

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { supplierName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
      ]
    } : {};
    
    const { products, total } = await productService.getProducts(query, page, limit);
    
    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch products' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id,
    };
    
    const product = await productService.createProduct(productData);
    
    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = {
      ...req.body,
      updatedBy: req.user._id,
    };
    
    const product = await productService.updateProduct(id, productData);
    
    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to delete product' });
  }
};