import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  getAnalyticsDashboard, 
  exportAnalyticsExcel, 
  getCandidatePerformanceMetrics 
} from '../controllers/analyticsController.js';

const router = express.Router();

// Get comprehensive analytics dashboard
router.get('/dashboard', authenticate, checkPermission('analytics', 'view'), getAnalyticsDashboard);

// Export analytics to Excel
router.get('/export/excel', authenticate, checkPermission('analytics', 'view'), exportAnalyticsExcel);

// Get candidate performance metrics
router.get('/candidate/:candidateId/performance', authenticate, checkPermission('candidates', 'view'), getCandidatePerformanceMetrics);

export default router;
