// routes/portfolio.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from '../controllers/portfolioController.js';

const router = express.Router();

// Portfolio validation rules
const portfolioValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Portfolio name is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
];

// Routes

router.get(
  '/',
  authenticate,
  checkPermission('portfolios', 'view'),
  getPortfolios
);

router.get(
  '/:id',
  authenticate,
  checkPermission('portfolios', 'view'),
  getPortfolio
);

router.post(
  '/',
  authenticate,
  checkPermission('portfolios', 'create'),
  portfolioValidation,
  validate,
  createPortfolio
);

router.put(
  '/:id',
  authenticate,
  checkPermission('portfolios', 'update'),
  portfolioValidation,
  validate,
  updatePortfolio
);

router.delete(
  '/:id',
  authenticate,
  checkPermission('portfolios', 'delete'),
  deletePortfolio
);

export default router;
