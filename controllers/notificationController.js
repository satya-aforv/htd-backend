import Notification from '../models/Notification.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';
import mongoose from 'mongoose';

// Create custom notification (admin only)
export const createNotification = async (req, res) => {
  try {
    const {
      recipientId,
      type = 'CUSTOM',
      title,
      message,
      priority = 'MEDIUM',
      scheduledFor,
      actionUrl,
      channels = {
        email: { enabled: true },
        sms: { enabled: false },
        inApp: { enabled: true }
      }
    } = req.body;
    
    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ 
        success: false,
        message: 'Recipient not found' 
      });
    }
    
    const notification = await notificationService.createNotification({
      recipient: recipientId,
      type,
      title,
      message,
      priority,
      channels,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      actionUrl,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create notification' 
    });
  }
};

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, priority } = req.query;
    const userId = req.user.id;
    
    const query = { recipient: userId };
    
    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };
    
    const notifications = await Notification.find(query)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort)
      .populate('createdBy', 'name')
      .populate('relatedEntity.entityId');
    
    const total = await Notification.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        totalPages: Math.ceil(total / options.limit),
        currentPage: options.page,
        totalNotifications: total,
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch notifications' 
    });
  }
};

// Alias for backward compatibility
export const getUserNotifications = getNotifications;

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }
    
    await notification.markAsRead();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark notification as read' 
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await Notification.updateMany(
      { 
        recipient: userId, 
        'channels.inApp.read': false 
      },
      { 
        'channels.inApp.read': true,
        'channels.inApp.readAt': new Date(),
        status: 'READ'
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark all notifications as read' 
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete notification' 
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Notification.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const typeStats = await Notification.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const formattedStats = {
      total: 0,
      unread: 0,
      read: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      byType: {}
    };
    
    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats[stat._id.toLowerCase()] = stat.count;
    });
    
    typeStats.forEach(stat => {
      formattedStats.byType[stat._id] = stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch notification statistics' 
    });
  }
};

// Send bulk notifications
export const sendBulkNotifications = async (req, res) => {
  try {
    const {
      recipientIds,
      type = 'CUSTOM',
      title,
      message,
      priority = 'MEDIUM',
      scheduledFor,
      actionUrl,
      channels = {
        email: { enabled: true },
        sms: { enabled: false },
        inApp: { enabled: true }
      }
    } = req.body;
    
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Recipients list is required' 
      });
    }
    
    // Verify all recipients exist
    const recipients = await User.find({ _id: { $in: recipientIds } });
    if (recipients.length !== recipientIds.length) {
      return res.status(400).json({ 
        success: false,
        message: 'Some recipients not found' 
      });
    }
    
    const notifications = [];
    for (const recipientId of recipientIds) {
      const notification = await notificationService.createNotification({
        recipient: recipientId,
        type,
        title,
        message,
        priority,
        channels,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        actionUrl,
        createdBy: req.user.id
      });
      notifications.push(notification);
    }
    
    res.status(201).json({
      success: true,
      message: `${notifications.length} notifications created successfully`,
      data: { count: notifications.length }
    });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create bulk notifications' 
    });
  }
};

// Process scheduled notifications (cron job endpoint)
export const processScheduledNotifications = async (req, res) => {
  try {
    const processedCount = await notificationService.processScheduledNotifications();
    
    res.status(200).json({
      success: true,
      message: `Processed ${processedCount} scheduled notifications`,
      data: { processedCount }
    });
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process scheduled notifications' 
    });
  }
};

// System notification helpers using the service
export const sendTrainingUpdateNotification = async (candidateId, trainingId, message, userId) => {
  return notificationService.notifyTrainingProgress(candidateId, trainingId, message, userId);
};

export const sendPaymentReminderNotification = async (candidateId, amount, dueDate, userId) => {
  return notificationService.notifyPaymentReminder(candidateId, amount, dueDate, userId);
};

export const sendEvaluationDueNotification = async (trainingId, evaluatorId, candidateName) => {
  return notificationService.notifyEvaluationDue(trainingId, evaluatorId, candidateName);
};
