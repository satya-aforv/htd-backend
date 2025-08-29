import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["TEXT", "NUMBER", "DATE", "BOOLEAN", "ARRAY", "OBJECT"],
    required: true,
  },
  source: {
    type: String,
    required: true, // e.g., "candidate.name", "training.status"
  },
  format: {
    type: String, // e.g., "currency", "percentage", "date"
  },
  aggregation: {
    type: String,
    enum: ["SUM", "COUNT", "AVG", "MIN", "MAX", "NONE"],
    default: "NONE",
  },
  visible: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const filterSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
    enum: ["EQUALS", "NOT_EQUALS", "CONTAINS", "NOT_CONTAINS", "GREATER_THAN", "LESS_THAN", "BETWEEN", "IN", "NOT_IN"],
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

const reportTemplateSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["CANDIDATE_REPORT", "TRAINING_REPORT", "PAYMENT_REPORT", "ANALYTICS_REPORT", "CUSTOM_REPORT"],
      required: true,
    },
    category: {
      type: String,
      enum: ["OPERATIONAL", "FINANCIAL", "PERFORMANCE", "COMPLIANCE", "CUSTOM"],
      default: "OPERATIONAL",
    },
    fields: [fieldSchema],
    filters: [filterSchema],
    groupBy: [{
      type: String,
    }],
    sortBy: [{
      field: {
        type: String,
        required: true,
      },
      direction: {
        type: String,
        enum: ["ASC", "DESC"],
        default: "ASC",
      },
    }],
    format: {
      type: String,
      enum: ["PDF", "EXCEL", "CSV", "JSON"],
      default: "PDF",
    },
    layout: {
      orientation: {
        type: String,
        enum: ["PORTRAIT", "LANDSCAPE"],
        default: "PORTRAIT",
      },
      pageSize: {
        type: String,
        enum: ["A4", "A3", "LETTER", "LEGAL"],
        default: "A4",
      },
      margins: {
        top: { type: Number, default: 50 },
        bottom: { type: Number, default: 50 },
        left: { type: Number, default: 50 },
        right: { type: Number, default: 50 },
      },
      headerHeight: { type: Number, default: 80 },
      footerHeight: { type: Number, default: 50 },
    },
    styling: {
      primaryColor: { type: String, default: "#3B82F6" },
      secondaryColor: { type: String, default: "#6B7280" },
      fontFamily: { type: String, default: "Helvetica" },
      fontSize: { type: Number, default: 12 },
      headerFontSize: { type: Number, default: 16 },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUsed: {
      type: Date,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
reportTemplateSchema.index({ type: 1, category: 1 });
reportTemplateSchema.index({ createdBy: 1, isPublic: 1 });
reportTemplateSchema.index({ name: "text", description: "text" });

// Update usage statistics
reportTemplateSchema.methods.recordUsage = function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

// Validate template structure
reportTemplateSchema.methods.validate = function() {
  const errors = [];
  
  if (this.fields.length === 0) {
    errors.push("Template must have at least one field");
  }
  
  // Check for duplicate field names
  const fieldNames = this.fields.map(f => f.name);
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate field names: ${duplicates.join(", ")}`);
  }
  
  return errors;
};

export default mongoose.model("ReportTemplate", reportTemplateSchema);
