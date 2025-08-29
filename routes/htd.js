import express from 'express';
import trainingsRouter from './trainings.js';
import paymentsRouter from './payments.js';

const router = express.Router();

// Mount the existing trainings router under /trainings
router.use('/trainings', trainingsRouter);
router.use('/payments', paymentsRouter);

export default router;
