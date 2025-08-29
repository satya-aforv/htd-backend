
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();

const productValidation = [
  body('supplierName').trim().isLength({ min: 2 }).withMessage('Supplier name must be at least 2 characters'),
  body('productCode').trim().isLength({ min: 1 }).withMessage('Product code is required'),
  body('principle').isMongoId().withMessage('Valid principle ID required'),
  body('dp').isNumeric().withMessage('DP must be a number'),
  body('mrp').isNumeric().withMessage('MRP must be a number'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
];

router.get('/', authenticate, checkPermission('products', 'view'), getProducts);
router.get('/:id', authenticate, checkPermission('products', 'view'), getProduct);
router.post('/', authenticate, checkPermission('products', 'create'), productValidation, validate, createProduct);
router.put('/:id', authenticate, checkPermission('products', 'update'), productValidation, validate, updateProduct);
router.delete('/:id', authenticate, checkPermission('products', 'delete'), deleteProduct);

export default router;
