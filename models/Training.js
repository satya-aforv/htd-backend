import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  technology: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number, // in days
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
    default: "NOT_STARTED",
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const evaluationSchema = new mongoose.Schema({
  month: {
    type: Number, // 1-12 for Jan-Dec
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comments: {
    type: String,
    trim: true,
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  evaluatedAt: {
    type: Date,
    default: Date.now,
  },
});

const expenseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["TRAINING_COST", "STIPEND", "MATERIAL", "OTHER"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const trainingSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    actualEndDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "DISCONTINUED"],
      default: "PLANNED",
    },
    modules: [moduleSchema],
    evaluations: [evaluationSchema],
    expenses: [expenseSchema],
    skillsAcquired: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        proficiency: {
          type: String,
          enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
          default: "BEGINNER",
        },
        acquiredDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    trainingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total training duration in days
trainingSchema.methods.calculateDuration = function () {
  if (!this.startDate) return 0;

  const endDate = this.actualEndDate || this.expectedEndDate || new Date();
  const diffTime = Math.abs(endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate total expenses
trainingSchema.methods.calculateTotalExpenses = function () {
  return this.expenses.reduce((total, expense) => total + expense.amount, 0);
};

// Calculate average evaluation rating
trainingSchema.methods.calculateAverageRating = function () {
  if (this.evaluations.length === 0) return 0;

  const totalRating = this.evaluations.reduce(
    (sum, evaluation) => sum + evaluation.rating,
    0
  );
  return totalRating / this.evaluations.length;
};

// Generate training summary
trainingSchema.methods.generateSummary = function () {
  return {
    candidateId: this.candidate,
    trainingId: this.trainingId,
    duration: this.calculateDuration(),
    status: this.status,
    totalModules: this.modules.length,
    completedModules: this.modules.filter((m) => m.status === "COMPLETED")
      .length,
    averageRating: this.calculateAverageRating(),
    totalExpenses: this.calculateTotalExpenses(),
    skillsAcquired: this.skillsAcquired.length,
  };
};

export default mongoose.model("Training", trainingSchema);
