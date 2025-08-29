import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Create notification (admin only)
router.post('/', authenticate, checkPermission('notifications', 'create'), createNotification);

// Get user notifications
router.get('/', authenticate, checkPermission('notifications', 'view'), getUserNotifications);

// Mark notification as read
router.patch('/:notificationId/read', authenticate, checkPermission('notifications', 'update'), markAsRead);

// Mark all notifications as read
router.patch('/read-all', authenticate, checkPermission('notifications', 'update'), markAllAsRead);

// Delete notification
router.delete('/:notificationId', authenticate, checkPermission('notifications', 'delete'), deleteNotification);

export default router;
