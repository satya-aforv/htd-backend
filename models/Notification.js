import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "TRAINING_PROGRESS",
        "PAYMENT_REMINDER", 
        "PAYMENT_COMPLETED",
        "EVALUATION_DUE",
        "TRAINING_COMPLETED",
        "CANDIDATE_STATUS_CHANGE",
        "DOCUMENT_UPLOAD",
        "SYSTEM_ALERT",
        "CUSTOM"
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "READ", "FAILED"],
      default: "PENDING",
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      inApp: {
        enabled: { type: Boolean, default: true },
        read: { type: Boolean, default: false },
        readAt: { type: Date },
      },
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["CANDIDATE", "TRAINING", "PAYMENT", "USER"],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  if (this.status === 'SENT') {
    this.status = 'READ';
  }
  return this.save();
};

// Check if notification should be sent
notificationSchema.methods.shouldSend = function() {
  if (this.status !== 'PENDING') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.scheduledFor > new Date()) return false;
  return true;
};

export default mongoose.model("Notification", notificationSchema);
