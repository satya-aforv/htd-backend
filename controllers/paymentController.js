import Payment from "../models/Payment.js";
import Candidate from "../models/Candidate.js";
import Training from "../models/Training.js";
import mongoose from "mongoose";

// Get all payments with filtering and pagination
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      month,
      year,
      search,
    } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { paymentDate: -1 },
      populate: "candidate",
    };

    const payments = await Payment.find(query)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort)
      .populate(options.populate);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      payments,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      totalPayments: total,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("candidate")
      .populate("relatedTraining")
      .populate("processedBy");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  try {
    const {
      candidateId,
      amount,
      type,
      paymentDate,
      mode,
      paymentMode,
      transactionId,
      bankDetails,
      trainingId,
      description,
      status,
      training,
      month,
      year,
      relatedTraining,
    } = req.body;

    // Check if candidate exists
    const candidateExists = await Candidate.findById({ _id: candidateId });
    if (!candidateExists) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Check if training exists if provided
    if (training) {
      const trainingExists = await Training.findById(training);
      if (!trainingExists) {
        return res.status(404).json({ message: "Training not found" });
      }
    }

    // Generate payment ID
    const paymentId = `PAY-${Date.now().toString().slice(-6)}`;

    // Set processor to current user
    const processor = req.user.id;

    const newPayment = new Payment({
      candidate: candidateId,
      amount,
      type,
      paymentDate: paymentDate || new Date(),
      paymentMode,
      mode,
      transactionId,
      bankDetails,
      description,
      status: status || "pending",
      processedBy: processor,
      training,
      month: month || new Date().getMonth() + 1, // 1-12
      year: year || new Date().getFullYear(),
      paymentId,
      relatedTraining: relatedTraining || null,
      trainingId: trainingId || null,
    });

    await newPayment.save();

    res.status(201).json({
      message: "Payment created successfully",
      payment: newPayment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating certain fields directly
    delete updateData.paymentId;
    delete updateData.candidate;
    delete updateData.processor;
    updateData.processedBy = req.user.id; // Update processor to current user

    const payment = await Payment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Upload payment proof
export const uploadPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Assuming file upload middleware stores file URL in req.file.path
    payment.proofUrl = req.file.path;
    payment.status = "VERIFIED"; // Optionally update status

    await payment.save();

    res.status(200).json({
      message: "Payment proof uploaded successfully",
      payment,
    });
  } catch (error) {
    console.error("Error uploading payment proof:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payments by candidate ID
export const getCandidatePayments = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { month, year, type } = req.query;

    const query = { candidate: candidateId };

    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);
    if (type) query.type = type;

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .populate("processedBy")
      .populate("relatedTraining");

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching candidate payments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get monthly payment summary for a candidate
export const getMonthlySummary = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { year } = req.query;

    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const summary = await Payment.getMonthlyPaymentSummary(
      candidateId,
      currentYear
    );

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error generating monthly summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Generate payment statement for a period
export const generatePaymentStatement = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required" });
    }

    const statement = await Payment.generatePaymentStatement(
      candidateId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json(statement);
  } catch (error) {
    console.error("Error generating payment statement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payment statistics
export const getPaymentStatistics = async (req, res) => {
  try {
    const { year, month } = req.query;

    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : null;

    // Match criteria
    const matchCriteria = { year: currentYear };
    if (currentMonth) matchCriteria.month = currentMonth;

    // Aggregate payments by type
    const paymentsByType = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Aggregate payments by status
    const paymentsByStatus = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Aggregate payments by month (if year is provided)
    let paymentsByMonth = [];
    if (!currentMonth) {
      paymentsByMonth = await Payment.aggregate([
        { $match: { year: currentYear } },
        {
          $group: {
            _id: "$month",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // Calculate total payments
    const totalPayments = await Payment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      paymentsByType,
      paymentsByStatus,
      paymentsByMonth,
      totalPayments: totalPayments[0] || { totalAmount: 0, count: 0 },
      period: currentMonth
        ? { year: currentYear, month: currentMonth }
        : { year: currentYear },
    });
  } catch (error) {
    console.error("Error generating payment statistics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get monthly payment summary for a candidate
Payment.getMonthlyPaymentSummary = async function (candidateId, year) {
  try {
    // Validate candidateId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      throw new Error("Invalid candidate ID");
    }

    // Aggregate payments by month for the specified candidate and year
    const monthlySummary = await this.aggregate([
      {
        $match: {
          candidate: new mongoose.Types.ObjectId(candidateId),
          year: year,
        },
      },
      {
        $group: {
          _id: "$month",
          totalReceived: {
            $sum: {
              $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0],
            },
          },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: "$_id",
          totalReceived: 1,
          totalPaid: 1,
          balance: { $subtract: ["$totalReceived", "$totalPaid"] },
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Fill in missing months with zero values
    const fullYearSummary = [];
    for (let month = 1; month <= 12; month++) {
      const existingMonth = monthlySummary.find((m) => m.month === month);
      if (existingMonth) {
        fullYearSummary.push(existingMonth);
      } else {
        fullYearSummary.push({
          month,
          totalReceived: 0,
          totalPaid: 0,
          balance: 0,
          count: 0,
        });
      }
    }

    return fullYearSummary;
  } catch (error) {
    throw error;
  }
};

// Get monthly payment summary for a specific candidate
export const getMonthlyPaymentSummary = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const summary = await Payment.getMonthlyPaymentSummary(
      candidateId,
      parseInt(year, 10)
    );

    res.status(200).json({
      success: true,
      data: summary,
      year: parseInt(year, 10),
    });
  } catch (error) {
    console.error("Error getting monthly payment summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Generate payment statement for a specific period
export const getPaymentStatement = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { month, year = new Date().getFullYear() } = req.query;

    // Validate inputs
    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: "Invalid candidate ID" });
    }

    // Build query
    const query = { candidateId: new mongoose.Types.ObjectId(candidateId) };

    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);

    // Get payments for the period
    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .populate("relatedTraining", "title description");

    // Calculate totals
    const totalIncome = payments
      .filter((p) => p.type === "INCOME")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalExpense = payments
      .filter((p) => p.type === "EXPENSE")
      .reduce((sum, p) => sum + p.amount, 0);

    // Get candidate details
    const candidate = await Candidate.findById(candidateId, "name email phone");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        candidate,
        payments,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          count: payments.length,
        },
        period: {
          month: month ? parseInt(month, 10) : null,
          year: parseInt(year, 10),
        },
      },
    });
  } catch (error) {
    console.error("Error generating payment statement:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get total payment summary for a candidate
export const getTotalPaymentSummary = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Validate candidateId
    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: "Invalid candidate ID" });
    }

    // Get total payments summary
    const summary = await Payment.aggregate([
      {
        $match: {
          candidate: new mongoose.Types.ObjectId(candidateId),
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
          totalByType: {
            $push: {
              type: "$type",
              amount: "$amount",
            },
          },
          totalByStatus: {
            $push: {
              status: "$status",
              amount: "$amount",
            },
          },
        },
      },
    ]);

    // Get candidate details
    const candidate = await Candidate.findById(candidateId, "name email phone");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const result = summary[0] || {
      totalAmount: 0,
      totalPayments: 0,
      totalByType: [],
      totalByStatus: [],
    };

    res.status(200).json({
      success: true,
      data: {
        candidate,
        summary: result,
      },
    });
  } catch (error) {
    console.error("Error getting total payment summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
