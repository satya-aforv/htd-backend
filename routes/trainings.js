import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { checkPermission } from "../middleware/permissions.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Import controllers (to be created)
import {
  getAllTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  deleteTraining,
  addModule,
  updateModule,
  deleteModule,
  addEvaluation,
  updateEvaluation,
  deleteEvaluation,
  addExpense,
  updateExpense,
  deleteExpense,
  addSkillAcquired,
  updateSkillAcquired,
  deleteSkillAcquired,
  getTrainingSummary,
  getCandidateTrainings,
} from "../controllers/trainingController.js";

// Get all trainings
router.get(
  "/",
  authenticate,
  // checkPermission('trainings', 'view'),
  getAllTrainings
);

// Get training by ID
router.get(
  "/:id",
  authenticate,
  // checkPermission('trainings', 'view'),
  getTrainingById
);

// Create new training
router.post(
  "/",
  authenticate,
  // checkPermission('trainings', 'create'),
  [
    body("candidate").notEmpty().withMessage("Candidate ID is required"),
    body("startDate").isDate().withMessage("Valid start date is required"),
    body("expectedEndDate")
      .isDate()
      .withMessage("Valid expected end date is required"),
    body("trainingId").notEmpty().withMessage("Training ID is required"),
  ],
  validate,
  createTraining
);

// Update training
router.put(
  "/:id",
  authenticate,
  // checkPermission('trainings', 'update'),
  updateTraining
);

// Delete training
router.delete(
  "/:id",
  authenticate,
  // checkPermission('trainings', 'delete'),
  deleteTraining
);

// Module routes
router.post(
  "/:id/modules",
  authenticate,
  // checkPermission('trainings', 'update'),
  [
    body("name").notEmpty().withMessage("Module name is required"),
    body("technology").notEmpty().withMessage("Technology is required"),
    body("duration").isNumeric().withMessage("Duration is required"),
    body("startDate").isDate().withMessage("Valid start date is required"),
    body("endDate").isDate().withMessage("Valid end date is required"),
  ],
  validate,
  addModule
);

router.put(
  "/:id/modules/:moduleId",
  authenticate,
  // checkPermission('trainings', 'update'),
  updateModule
);

router.delete(
  "/:id/modules/:moduleId",
  authenticate,
  // checkPermission('trainings', 'update'),
  deleteModule
);

// Evaluation routes
router.post(
  "/:id/evaluations",
  authenticate,
  // checkPermission('trainings', 'update'),
  [
    body("month")
      .isInt({ min: 1, max: 12 })
      .withMessage("Valid month is required"),
    body("year").isNumeric().withMessage("Year is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating between 1-5 is required"),
  ],
  validate,
  addEvaluation
);

router.put(
  "/:id/evaluations/:evaluationId",
  authenticate,
  // checkPermission('trainings', 'update'),
  updateEvaluation
);

router.delete(
  "/:id/evaluations/:evaluationId",
  authenticate,
  // checkPermission('trainings', 'update'),
  deleteEvaluation
);

// Expense routes
router.post(
  "/:id/expenses",
  authenticate,
  // checkPermission('trainings', 'update'),
  [
    body("type")
      .isIn(["TRAINING_COST", "STIPEND", "MATERIAL", "OTHER"])
      .withMessage("Valid expense type is required"),
    body("amount").isNumeric().withMessage("Amount is required"),
    body("date").isDate().withMessage("Valid date is required"),
  ],
  validate,
  addExpense
);

router.put(
  "/:id/expenses/:expenseId",
  authenticate,
  // checkPermission('trainings', 'update'),
  updateExpense
);

router.delete(
  "/:id/expenses/:expenseId",
  authenticate,
  // checkPermission('trainings', 'update'),
  deleteExpense
);

// Skill Acquired routes
router.post(
  "/:id/skills",
  authenticate,
  // checkPermission('trainings', 'update'),
  [
    body("name").notEmpty().withMessage("Skill name is required"),
    body("proficiency")
      .isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
      .withMessage("Valid proficiency level is required"),
  ],
  validate,
  addSkillAcquired
);

router.put(
  "/:id/skills/:skillId",
  authenticate,
  // checkPermission('trainings', 'update'),
  updateSkillAcquired
);

router.delete(
  "/:id/skills/:skillId",
  authenticate,
  // checkPermission('trainings', 'update'),
  deleteSkillAcquired
);

// Get training summary
router.get(
  "/:id/summary",
  authenticate,
  // checkPermission('trainings', 'view'),
  getTrainingSummary
);

// Get trainings by candidate ID
router.get(
  "/candidate/:candidateId",
  authenticate,
  // checkPermission('trainings', 'view'),
  getCandidateTrainings
);

export default router;
