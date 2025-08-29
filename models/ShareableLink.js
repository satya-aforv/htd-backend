import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const shareableLinkSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    linkId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    maxAccess: {
      type: Number,
      default: null, // null means unlimited
    },
    allowedDomains: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastAccessedAt: {
      type: Date,
    },
    accessLog: [{
      accessedAt: {
        type: Date,
        default: Date.now,
      },
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Check if link is valid and accessible
shareableLinkSchema.methods.isAccessible = function() {
  if (!this.isActive) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.maxAccess && this.accessCount >= this.maxAccess) return false;
  return true;
};

// Log access attempt
shareableLinkSchema.methods.logAccess = function(ipAddress, userAgent) {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  this.accessLog.push({
    accessedAt: new Date(),
    ipAddress,
    userAgent,
  });
  return this.save();
};

export default mongoose.model("ShareableLink", shareableLinkSchema);
