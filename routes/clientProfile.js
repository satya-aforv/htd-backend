import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { generateClientProfile, exportClientProfilePDF } from '../controllers/clientProfileController.js';

const router = express.Router();

// Generate client-facing candidate profile
router.get('/:candidateId', authenticate, checkPermission('candidates', 'view'), generateClientProfile);

// Export client profile as PDF
router.get('/:candidateId/pdf', authenticate, checkPermission('candidates', 'view'), exportClientProfilePDF);

export default router;
