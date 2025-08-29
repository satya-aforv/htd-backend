import express from 'express';
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getScheduledReportById,
  toggleScheduledReport,
  runScheduledReportNow,
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  getScheduleOptions
} from '../controllers/scheduledReportController.js';

const router = express.Router();

// Schedule options
router.get('/options', getScheduleOptions);

// Scheduler management (admin only)
router.get('/scheduler/status', getSchedulerStatus);
router.post('/scheduler/start', startScheduler);
router.post('/scheduler/stop', stopScheduler);

// Scheduled report CRUD
router.get('/', getScheduledReports);
router.post('/', createScheduledReport);
router.get('/:reportId', getScheduledReportById);
router.put('/:reportId', updateScheduledReport);
router.delete('/:reportId', deleteScheduledReport);

// Scheduled report actions
router.post('/:reportId/toggle', toggleScheduledReport);
router.post('/:reportId/run', runScheduledReportNow);

export default router;
