import ScheduledReport from "../models/ScheduledReport.js";
import ReportTemplate from "../models/ReportTemplate.js";
import reportService from "./reportService.js";
import notificationService from "./notificationService.js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;

    // Email transporter for report delivery
    // this.emailTransporter = nodemailer.createTransporter({
    //   host: process.env.SMTP_HOST || 'smtp.gmail.com',
    //   port: process.env.SMTP_PORT || 587,
    //   secure: false,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
  }

  // Start the scheduler
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log("Scheduler is already running");
      return;
    }

    console.log(
      `Starting report scheduler with ${intervalMinutes} minute intervals`
    );
    this.isRunning = true;

    // Run immediately
    this.processScheduledReports();

    // Set up recurring execution
    this.intervalId = setInterval(() => {
      this.processScheduledReports();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log("Scheduler is not running");
      return;
    }

    console.log("Stopping report scheduler");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Process all scheduled reports that are due
  async processScheduledReports() {
    try {
      const dueReports = await ScheduledReport.find({
        isActive: true,
        nextRun: { $lte: new Date() },
      })
        .populate("template")
        .populate("recipients.user", "name email")
        .populate("createdBy", "name email");

      console.log(`Found ${dueReports.length} scheduled reports to process`);

      for (const scheduledReport of dueReports) {
        await this.executeScheduledReport(scheduledReport);
      }
    } catch (error) {
      console.error("Error processing scheduled reports:", error);
    }
  }

  // Execute a single scheduled report
  async executeScheduledReport(scheduledReport) {
    try {
      console.log(`Executing scheduled report: ${scheduledReport.name}`);

      // Validate required data
      if (!scheduledReport?.template?._id) {
        throw new Error("Invalid scheduled report: missing template ID");
      }

      // Generate the report
      const reportData = await reportService.generateReport(
        scheduledReport.template._id,
        scheduledReport.parameters || {},
        scheduledReport.format
      );

      // Validate report data
      if (!reportData) {
        throw new Error("Report generation failed: no data returned");
      }

      // Save report to temporary file
      const reportPath = await this.saveReportToFile(
        reportData,
        scheduledReport.name,
        scheduledReport.format
      );

      // Deliver report to recipients
      await this.deliverReport(scheduledReport, reportPath);

      // Record successful execution
      await scheduledReport.recordRun(true);

      // Clean up temporary file after delivery
      setTimeout(() => {
        this.cleanupFile(reportPath);
      }, 5 * 60 * 1000); // Clean up after 5 minutes

      console.log(
        `Successfully executed scheduled report: ${scheduledReport.name}`
      );
    } catch (error) {
      console.error(
        `Error executing scheduled report ${scheduledReport.name}:`,
        error
      );

      // Record failed execution
      await scheduledReport.recordRun(false, error.message);

      // Notify admin about failure
      await this.notifyReportFailure(scheduledReport, error);
    }
  }

  // Save report data to temporary file
  async saveReportToFile(reportData, reportName, format) {
    if (!reportData || !reportName || !format) {
      throw new Error("Invalid parameters for saving report file");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = reportName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${sanitizedName}-${timestamp}.${format.toLowerCase()}`;
    const reportsDir = path.join(__dirname, "../temp/reports");

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, filename);

    switch (format) {
      case "PDF":
        return new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(filePath);
          reportData.pipe(stream);
          reportData.end();
          stream.on("finish", () => resolve(filePath));
          stream.on("error", reject);
        });

      case "EXCEL":
        await reportData.xlsx.writeFile(filePath);
        return filePath;

      case "CSV":
        fs.writeFileSync(filePath, reportData);
        return filePath;

      case "JSON":
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        return filePath;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Deliver report to recipients
  async deliverReport(scheduledReport, reportPath) {
    const { recipients, name, format } = scheduledReport;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("No valid recipients found for report delivery");
    }

    for (const recipient of recipients) {
      if (!recipient?.email) {
        console.warn("Skipping recipient with missing email:", recipient);
        continue;
      }
      try {
        if (
          recipient.deliveryMethod === "EMAIL" ||
          recipient.deliveryMethod === "BOTH"
        ) {
          await this.sendReportByEmail(recipient, scheduledReport, reportPath);
        }

        if (
          recipient.deliveryMethod === "DOWNLOAD_LINK" ||
          recipient.deliveryMethod === "BOTH"
        ) {
          await this.sendDownloadLink(recipient, scheduledReport, reportPath);
        }
      } catch (error) {
        console.error(`Error delivering report to ${recipient.email}:`, error);
      }
    }
  }

  // Send report via email
  async sendReportByEmail(recipient, scheduledReport, reportPath) {
    if (!recipient?.email || !scheduledReport?.name || !reportPath) {
      throw new Error("Invalid parameters for email delivery");
    }

    const { name, format, template } = scheduledReport;

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@htd-system.com",
      to: recipient.email,
      subject: `Scheduled Report: ${name}`,
      html: `
        <h2>Scheduled Report Delivery</h2>
        <p>Dear ${recipient.user?.name || "User"},</p>
        <p>Please find attached your scheduled report: <strong>${name}</strong></p>
        <p><strong>Report Details:</strong></p>
        <ul>
          <li>Template: ${template?.name || "Unknown"}</li>
          <li>Format: ${format}</li>
          <li>Generated: ${new Date().toLocaleString()}</li>
        </ul>
        <p>This report was automatically generated based on your scheduled preferences.</p>
        <p>Best regards,<br>HTD System</p>
      `,
      attachments: [
        {
          filename: path.basename(reportPath),
          path: reportPath,
        },
      ],
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Send download link (for future implementation with file storage)
  async sendDownloadLink(recipient, scheduledReport, reportPath) {
    if (!recipient?.user?._id) {
      console.warn(
        "Cannot send download link: missing user ID for recipient",
        recipient
      );
      return;
    }

    // For now, create a notification with download instructions
    await notificationService.createNotification({
      recipient: recipient.user._id,
      type: "SYSTEM_ALERT",
      title: "Scheduled Report Ready",
      message: `Your scheduled report "${scheduledReport.name}" is ready for download.`,
      priority: "MEDIUM",
      channels: {
        email: { enabled: true },
        sms: { enabled: false },
        inApp: { enabled: true },
      },
      actionUrl: `/reports/download/${scheduledReport._id}`,
      metadata: {
        reportPath: reportPath,
        format: scheduledReport.format,
      },
    });
  }

  // Notify about report failure
  async notifyReportFailure(scheduledReport, error) {
    if (!scheduledReport?.createdBy?._id) {
      console.error("Cannot notify report failure: missing creator ID");
      return;
    }

    await notificationService.createNotification({
      recipient: scheduledReport.createdBy._id,
      type: "SYSTEM_ALERT",
      title: "Scheduled Report Failed",
      message: `The scheduled report "${scheduledReport.name}" failed to generate. Error: ${error.message}`,
      priority: "HIGH",
      channels: {
        email: { enabled: true },
        sms: { enabled: false },
        inApp: { enabled: true },
      },
      actionUrl: `/reports/scheduled/${scheduledReport._id}`,
      metadata: {
        error: error.message,
        reportId: scheduledReport._id,
      },
    });
  }

  // Clean up temporary files
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }

  // Clean up old report files based on retention policy
  async cleanupOldReports() {
    try {
      const reportsDir = path.join(__dirname, "../temp/reports");

      if (!fs.existsSync(reportsDir)) {
        return;
      }

      const files = fs.readdirSync(reportsDir);
      const now = new Date();

      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);

        // Default retention: 7 days for temporary files
        if (ageInDays > 7) {
          this.cleanupFile(filePath);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old reports:", error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
    };
  }

  // Create a new scheduled report
  async createScheduledReport(reportData) {
    const scheduledReport = new ScheduledReport(reportData);

    // Calculate initial next run time
    scheduledReport.calculateNextRun();

    await scheduledReport.save();
    return scheduledReport;
  }

  // Update scheduled report
  async updateScheduledReport(reportId, updateData) {
    if (!reportId) {
      throw new Error("Report ID is required");
    }

    const scheduledReport = await ScheduledReport.findById(reportId);
    if (!scheduledReport) {
      throw new Error("Scheduled report not found");
    }

    Object.assign(scheduledReport, updateData);

    // Recalculate next run if schedule changed
    if (updateData.schedule) {
      scheduledReport.calculateNextRun();
    }

    await scheduledReport.save();
    return scheduledReport;
  }

  // Delete scheduled report
  async deleteScheduledReport(reportId) {
    if (!reportId) {
      throw new Error("Report ID is required");
    }

    const scheduledReport = await ScheduledReport.findByIdAndDelete(reportId);
    if (!scheduledReport) {
      throw new Error("Scheduled report not found");
    }
    return scheduledReport;
  }

  // Get scheduled reports for a user
  async getUserScheduledReports(userId, options = {}) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { page = 1, limit = 10, isActive } = options;

    const query = { createdBy: userId };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const reports = await ScheduledReport.find(query)
      .populate("template", "name type")
      .populate("recipients.user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * Math.max(1, limit))
      .limit(Math.max(1, Math.min(100, limit)));

    const total = await ScheduledReport.countDocuments(query);

    return {
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalReports: total,
    };
  }
}

export default new SchedulerService();
