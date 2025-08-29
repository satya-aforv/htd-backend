import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  exportCandidatesExcel,
  exportTrainingsExcel,
  exportPaymentsExcel,
  exportComprehensiveReport
} from '../controllers/exportController.js';

const router = express.Router();

// Export candidates to Excel
router.get('/candidates/excel', authenticate, checkPermission('exports', 'create'), exportCandidatesExcel);

// Export trainings to Excel
router.get('/trainings/excel', authenticate, checkPermission('exports', 'create'), exportTrainingsExcel);

// Export payments to Excel
router.get('/payments/excel', authenticate, checkPermission('exports', 'create'), exportPaymentsExcel);

// Export comprehensive report
router.get('/comprehensive/excel', authenticate, checkPermission('exports', 'create'), exportComprehensiveReport);

export default router;
