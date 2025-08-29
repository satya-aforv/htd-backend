import express from 'express';
import { getDashboardStats } from '../controllers/htdDashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected with authentication middleware
router.use(authenticate);

// @route   GET /api/htd/dashboard/stats
// @desc    Get dashboard statistics for HTD system
// @access  Private
router.get('/stats', getDashboardStats);

export default router;