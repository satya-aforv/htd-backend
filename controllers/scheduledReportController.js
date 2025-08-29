import ScheduledReport from '../models/ScheduledReport.js';
import ReportTemplate from '../models/ReportTemplate.js';
import schedulerService from '../services/schedulerService.js';
import mongoose from 'mongoose';

// Get all scheduled reports for user
export const getScheduledReports = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { page = 1, limit = 10, isActive } = req.query;
    
    const result = await schedulerService.getUserScheduledReports(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled reports'
    });
  }
};

// Create new scheduled report
export const createScheduledReport = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const {
      name,
      description,
      templateId,
      schedule,
      parameters = {},
      recipients,
      format = 'PDF',
      retentionDays = 30
    } = req.body;

    // Validate template exists
    const template = await ReportTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Report template not found'
      });
    }

    // Validate required fields
    if (!name || !templateId || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Name, template, and schedule are required'
      });
    }
    
    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient is required'
      });
    }

    const scheduledReportData = {
      name,
      description,
      template: templateId,
      schedule,
      parameters,
      recipients,
      format,
      retentionDays,
      createdBy: userId
    };

    const scheduledReport = await schedulerService.createScheduledReport(scheduledReportData);

    res.status(201).json({
      success: true,
      message: 'Scheduled report created successfully',
      data: scheduledReport
    });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduled report'
    });
  }
};

// Update scheduled report
export const updateScheduledReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    // Verify ownership
    const existingReport = await ScheduledReport.findOne({
      _id: reportId,
      createdBy: userId
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found or access denied'
      });
    }

    // Validate template if being updated
    if (req.body.templateId) {
      const template = await ReportTemplate.findById(req.body.templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Report template not found'
        });
      }
      req.body.template = req.body.templateId;
      delete req.body.templateId;
    }

    const updatedReport = await schedulerService.updateScheduledReport(reportId, req.body);

    res.json({
      success: true,
      message: 'Scheduled report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled report'
    });
  }
};

// Delete scheduled report
export const deleteScheduledReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    // Verify ownership
    const existingReport = await ScheduledReport.findOne({
      _id: reportId,
      createdBy: userId
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found or access denied'
      });
    }

    await schedulerService.deleteScheduledReport(reportId);

    res.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled report'
    });
  }
};

// Get scheduled report by ID
export const getScheduledReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    const scheduledReport = await ScheduledReport.findOne({
      _id: reportId,
      createdBy: userId
    })
    .populate('template')
    .populate('recipients.user', 'name email')
    .populate('createdBy', 'name email');

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found or access denied'
      });
    }

    res.json({
      success: true,
      data: scheduledReport
    });
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled report'
    });
  }
};

// Toggle scheduled report active status
export const toggleScheduledReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const scheduledReport = await ScheduledReport.findOne({
      _id: reportId,
      createdBy: userId
    });

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found or access denied'
      });
    }

    scheduledReport.isActive = !scheduledReport.isActive;
    
    // If reactivating, recalculate next run
    if (scheduledReport.isActive) {
      scheduledReport.calculateNextRun();
    }
    
    await scheduledReport.save();

    res.json({
      success: true,
      message: `Scheduled report ${scheduledReport.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: scheduledReport.isActive,
        nextRun: scheduledReport.nextRun
      }
    });
  } catch (error) {
    console.error('Error toggling scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle scheduled report'
    });
  }
};

// Run scheduled report immediately
export const runScheduledReportNow = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const scheduledReport = await ScheduledReport.findOne({
      _id: reportId,
      createdBy: userId
    })
    .populate('template')
    .populate('recipients.user', 'name email')
    .populate('createdBy', 'name email');

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found or access denied'
      });
    }

    // Execute the report immediately
    await schedulerService.executeScheduledReport(scheduledReport);

    res.json({
      success: true,
      message: 'Scheduled report executed successfully'
    });
  } catch (error) {
    console.error('Error running scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run scheduled report'
    });
  }
};

// Get scheduler status (admin only)
export const getSchedulerStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const status = schedulerService.getStatus();
    
    // Get additional statistics
    const totalScheduled = await ScheduledReport.countDocuments();
    const activeScheduled = await ScheduledReport.countDocuments({ isActive: true });
    const dueReports = await ScheduledReport.countDocuments({
      isActive: true,
      nextRun: { $lte: new Date() }
    });

    res.json({
      success: true,
      data: {
        scheduler: status,
        statistics: {
          totalScheduled,
          activeScheduled,
          dueReports
        }
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
};

// Start scheduler (admin only)
export const startScheduler = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { intervalMinutes = 5 } = req.body;
    schedulerService.start(intervalMinutes);

    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler'
    });
  }
};

// Stop scheduler (admin only)
export const stopScheduler = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    schedulerService.stop();

    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler'
    });
  }
};

// Get schedule frequency options
export const getScheduleOptions = async (req, res) => {
  try {
    const scheduleOptions = {
      frequencies: [
        { value: 'DAILY', label: 'Daily', description: 'Run every day at specified time' },
        { value: 'WEEKLY', label: 'Weekly', description: 'Run weekly on specified day and time' },
        { value: 'MONTHLY', label: 'Monthly', description: 'Run monthly on specified date and time' },
        { value: 'QUARTERLY', label: 'Quarterly', description: 'Run every quarter' },
        { value: 'YEARLY', label: 'Yearly', description: 'Run annually' },
        { value: 'CUSTOM', label: 'Custom', description: 'Use custom cron expression' }
      ],
      daysOfWeek: [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' }
      ],
      deliveryMethods: [
        { value: 'EMAIL', label: 'Email Attachment', description: 'Send report as email attachment' },
        { value: 'DOWNLOAD_LINK', label: 'Download Link', description: 'Send download link via notification' },
        { value: 'BOTH', label: 'Both', description: 'Send both email attachment and download link' }
      ],
      formats: [
        { value: 'PDF', label: 'PDF', description: 'Portable Document Format' },
        { value: 'EXCEL', label: 'Excel', description: 'Microsoft Excel spreadsheet' },
        { value: 'CSV', label: 'CSV', description: 'Comma-separated values' },
        { value: 'JSON', label: 'JSON', description: 'JavaScript Object Notation' }
      ]
    };

    res.json({
      success: true,
      data: scheduleOptions
    });
  } catch (error) {
    console.error('Error fetching schedule options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule options'
    });
  }
};
