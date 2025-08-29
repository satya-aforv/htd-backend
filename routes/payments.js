import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { checkPermission } from "../middleware/permissions.js";
import { uploadDocument } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Import controllers (to be created)
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  uploadPaymentProof,
  getCandidatePayments,
  getPaymentStatement,
  getMonthlyPaymentSummary,
  getTotalPaymentSummary,
} from "../controllers/paymentController.js";

// Get all payments
router.get(
  "/",
  authenticate,
  // checkPermission('payments', 'view'),
  getAllPayments
);

// Get payment by ID
router.get(
  "/:id",
  authenticate,
  // checkPermission('payments', 'view'),
  getPaymentById
);

// Create new payment
router.post(
  "/",
  authenticate,
  // checkPermission('payments', 'create'),
  [
    body("candidate").notEmpty().withMessage("Candidate ID is required"),
    body("amount").isNumeric().withMessage("Amount is required"),
    body("type")
      .isIn(["STIPEND", "SALARY", "BONUS", "REIMBURSEMENT", "OTHER"])
      .withMessage("Valid payment type is required"),
    body("paymentDate").isDate().withMessage("Valid payment date is required"),
    body("paymentMode")
      .isIn(["BANK_TRANSFER", "CHEQUE", "CASH", "UPI", "OTHER"])
      .withMessage("Valid payment mode is required"),
    body("month")
      .isInt({ min: 1, max: 12 })
      .withMessage("Valid month is required"),
    body("year").isNumeric().withMessage("Year is required"),
    body("paymentId").notEmpty().withMessage("Payment ID is required"),
  ],
  validate,
  createPayment
);

// Update payment
router.put(
  "/:id",
  authenticate,
  // checkPermission('payments', 'update'),
  updatePayment
);

// Delete payment
router.delete(
  "/:id",
  authenticate,
  // checkPermission('payments', 'delete'),
  deletePayment
);

// Upload payment proof
router.post(
  "/:id/proof",
  authenticate,
  // checkPermission('payments', 'update'),
  uploadDocument,
  uploadPaymentProof
);

// Get payments by candidate ID
router.get(
  "/candidate/:candidateId",
  authenticate,
  // checkPermission('payments', 'view'),
  getCandidatePayments
);

// Get payment statement for a specific period
router.get(
  "/statement/:candidateId",
  authenticate,
  // checkPermission('payments', 'view'),
  getPaymentStatement
);

// Get monthly payment summary for a candidate
router.get(
  "/monthly-summary/:candidateId/:year",
  authenticate,
  // checkPermission('payments', 'view'),
  getMonthlyPaymentSummary
);

// Get total payment summary for a candidate
router.get(
  "/total-summary/:candidateId",
  authenticate,
  // checkPermission('payments', 'view'),
  getTotalPaymentSummary
);

export default router;
