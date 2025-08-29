import mongoose from "mongoose";

const scheduledReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportTemplate",
      required: true,
    },
    schedule: {
      frequency: {
        type: String,
        enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
        required: true,
      },
      cronExpression: {
        type: String, // For custom schedules
      },
      dayOfWeek: {
        type: Number, // 0-6 for Sunday-Saturday (for weekly)
        min: 0,
        max: 6,
      },
      dayOfMonth: {
        type: Number, // 1-31 (for monthly)
        min: 1,
        max: 31,
      },
      time: {
        hour: {
          type: Number,
          min: 0,
          max: 23,
          default: 9, // 9 AM default
        },
        minute: {
          type: Number,
          min: 0,
          max: 59,
          default: 0,
        },
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recipients: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      deliveryMethod: {
        type: String,
        enum: ["EMAIL", "DOWNLOAD_LINK", "BOTH"],
        default: "EMAIL",
      },
    }],
    format: {
      type: String,
      enum: ["PDF", "EXCEL", "CSV", "JSON"],
      default: "PDF",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRun: {
      type: Date,
    },
    nextRun: {
      type: Date,
      required: true,
    },
    runCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    retentionDays: {
      type: Number,
      default: 30, // Keep generated reports for 30 days
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
scheduledReportSchema.index({ nextRun: 1, isActive: 1 });
scheduledReportSchema.index({ createdBy: 1 });
scheduledReportSchema.index({ template: 1 });

// Calculate next run time based on schedule
scheduledReportSchema.methods.calculateNextRun = function() {
  const now = new Date();
  const { frequency, dayOfWeek, dayOfMonth, time, timezone } = this.schedule;
  
  let nextRun = new Date();
  nextRun.setHours(time.hour, time.minute, 0, 0);
  
  switch (frequency) {
    case 'DAILY':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'WEEKLY':
      const currentDay = nextRun.getDay();
      const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
      
    case 'MONTHLY':
      nextRun.setDate(dayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
      
    case 'QUARTERLY':
      const currentMonth = nextRun.getMonth();
      const monthsUntilQuarter = (3 - (currentMonth % 3)) % 3;
      nextRun.setMonth(currentMonth + monthsUntilQuarter);
      nextRun.setDate(1); // First day of quarter
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 3);
      }
      break;
      
    case 'YEARLY':
      nextRun.setMonth(0, 1); // January 1st
      if (nextRun <= now) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }
      break;
  }
  
  this.nextRun = nextRun;
  return nextRun;
};

// Update run statistics
scheduledReportSchema.methods.recordRun = function(success = true, error = null) {
  this.lastRun = new Date();
  this.runCount += 1;
  
  if (success) {
    this.lastError = null;
  } else {
    this.failureCount += 1;
    this.lastError = error;
  }
  
  // Calculate next run
  this.calculateNextRun();
  
  return this.save();
};

// Check if report should run
scheduledReportSchema.methods.shouldRun = function() {
  if (!this.isActive) return false;
  if (this.nextRun > new Date()) return false;
  return true;
};

export default mongoose.model("ScheduledReport", scheduledReportSchema);
