import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    trainingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["stipend", "salary", "bonus", "reimbursement", "other"],
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["bank_transfer", "cheque", "cash", "upi", "other"],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
      },
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paymentProofUrl: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    relatedTraining: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Training",
    },
    month: {
      type: String, // 1-12 for Jan-Dec
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    paymentId: {
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

// Static method to calculate total payments for a candidate
paymentSchema.statics.calculateTotalPaymentsForCandidate = async function (
  candidateId
) {
  const result = await this.aggregate([
    {
      $match: {
        candidate: mongoose.Types.ObjectId(candidateId),
        status: "COMPLETED",
      },
    },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  const paymentSummary = {
    totalPaid: 0,
    stipend: 0,
    salary: 0,
    bonus: 0,
    reimbursement: 0,
    other: 0,
  };

  result.forEach((item) => {
    const type = item._id.toLowerCase();
    paymentSummary[type] = item.total;
    paymentSummary.totalPaid += item.total;
  });

  return paymentSummary;
};

// Static method to get monthly payment summary for a candidate
paymentSchema.statics.getMonthlyPaymentSummary = async function (
  candidateId,
  year
) {
  const result = await this.aggregate([
    {
      $match: {
        candidate: mongoose.Types.ObjectId(candidateId),
        status: "COMPLETED",
        year: year,
      },
    },
    {
      $group: {
        _id: { month: "$month", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  const monthlySummary = {};

  // Initialize all months
  for (let i = 1; i <= 12; i++) {
    monthlySummary[i] = {
      month: i,
      stipend: 0,
      salary: 0,
      bonus: 0,
      reimbursement: 0,
      other: 0,
      total: 0,
    };
  }

  // Fill in actual data
  result.forEach((item) => {
    const month = item._id.month;
    const type = item._id.type.toLowerCase();

    monthlySummary[month][type] = item.total;
    monthlySummary[month].total += item.total;
  });

  return Object.values(monthlySummary);
};

// Generate payment statement for a specific period
paymentSchema.statics.generatePaymentStatement = async function (
  candidateId,
  startDate,
  endDate
) {
  const payments = await this.find({
    candidate: candidateId,
    status: "COMPLETED",
    paymentDate: { $gte: startDate, $lte: endDate },
  }).sort({ paymentDate: 1 });

  const totalAmount = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return {
    candidateId,
    startDate,
    endDate,
    payments,
    totalAmount,
    generatedAt: new Date(),
  };
};

export default mongoose.model("Payment", paymentSchema);
