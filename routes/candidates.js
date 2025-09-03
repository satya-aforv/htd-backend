import express from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { checkPermission } from "../middleware/permissions.js";
import { uploadDocument } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Import controllers (to be created)
import {
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadCandidateDocument,
  getCandidateDocuments,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  addCareerGap,
  updateCareerGap,
  deleteCareerGap,
  addSkill,
  updateSkill,
  deleteSkill,
  generateClientProfile,
} from "../controllers/candidateController.js";

// Get all candidates
router.get(
  "/",
  authenticate,
  // checkPermission("candidates", "view"),
  getAllCandidates
);

// Get candidate by ID
router.get(
  "/:id",
  authenticate,
  // checkPermission("candidates", "view"),
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  getCandidateById
);

// Create new candidate
router.post(
  "/",
  authenticate,
  // checkPermission("candidates", "create"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("contactNumber").notEmpty().withMessage("Contact number is required"),
    body("dateOfBirth").isDate().withMessage("Valid date of birth is required"),
    body("gender")
      .customSanitizer((v) => (typeof v === "string" ? v.toUpperCase() : v))
      .isIn(["MALE", "FEMALE", "OTHER"])
      .withMessage("Valid gender is required"),
    body("address.street").notEmpty().withMessage("Street address is required"),
    body("address.city").notEmpty().withMessage("City is required"),
    body("address.state").notEmpty().withMessage("State is required"),
    body("address.pincode").notEmpty().withMessage("Pincode is required"),
    // Optional: accept status in any case
    body("status")
      .optional()
      .customSanitizer((v) => (typeof v === "string" ? v.toUpperCase() : v))
      .isIn(["HIRED", "IN_TRAINING", "DEPLOYED", "INACTIVE"])
      .withMessage("Valid status is required"),
  ],
  validate,
  createCandidate
);

// Update candidate
router.put(
  "/:id",
  authenticate,
  // checkPermission("candidates", "update"),
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  updateCandidate
);

// Delete candidate
router.delete(
  "/:id",
  authenticate,
  // checkPermission("candidates", "delete"),
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  deleteCandidate
);

// Upload candidate document
router.post(
  "/:id/documents",
  authenticate,
  // checkPermission("candidates", "update"),
  uploadDocument,
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  uploadCandidateDocument
);

// Get candidate documents
router.get(
  "/:id/documents",
  authenticate,
  // checkPermission("candidates", "view"),
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  getCandidateDocuments
);

// Education routes
router.post(
  "/:id/education",
  authenticate,
  // checkPermission("candidates", "update"),
  [
    body("degree").notEmpty().withMessage("Degree is required"),
    body("institution").notEmpty().withMessage("Institution is required"),
    body("yearOfPassing")
      .isNumeric()
      .withMessage("Year of passing is required"),
    body("percentage").isNumeric().withMessage("Percentage is required"),
  ],
  validate,
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  addEducation
);

router.put(
  "/:id/education/:educationId",
  authenticate,
  // checkPermission("candidates", "update"),
  updateEducation
);

router.delete(
  "/:id/education/:educationId",
  authenticate,
  // checkPermission("candidates", "update"),
  deleteEducation
);

// Experience routes
router.post(
  "/:id/experience",
  authenticate,
  // checkPermission("candidates", "update"),
  [
    body("type")
      .isIn(["IT", "NON-IT"])
      .withMessage("Valid experience type is required"),
    body("companyName").notEmpty().withMessage("Company name is required"),
    body("role").notEmpty().withMessage("Role is required"),
    body("startDate").isDate().withMessage("Valid start date is required"),
    body("endDate").isDate().withMessage("Valid end date is required"),
    body("salary").isNumeric().withMessage("Salary is required"),
  ],
  validate,
  addExperience
);

router.put(
  "/:id/experience/:experienceId",
  authenticate,
  // checkPermission("candidates", "update"),
  updateExperience
);

router.delete(
  "/:id/experience/:experienceId",
  authenticate,
  // checkPermission("candidates", "update"),
  deleteExperience
);

// Career Gap routes
router.post(
  "/:id/career-gaps",
  authenticate,
  // checkPermission("candidates", "update"),
  [
    body("startDate").isDate().withMessage("Valid start date is required"),
    body("endDate").isDate().withMessage("Valid end date is required"),
    body("reason").notEmpty().withMessage("Reason is required"),
  ],
  validate,
  addCareerGap
);

router.put(
  "/:id/career-gaps/:gapId",
  authenticate,
  // checkPermission("candidates", "update"),
  updateCareerGap
);

router.delete(
  "/:id/career-gaps/:gapId",
  authenticate,
  // checkPermission("candidates", "update"),
  deleteCareerGap
);

// Skill routes
router.post(
  "/:id/skills",
  authenticate,
  // checkPermission("candidates", "update"),
  [
    body("name").notEmpty().withMessage("Skill name is required"),
    body("type")
      .isIn(["IT", "NON-IT"])
      .withMessage("Valid skill type is required"),
    body("proficiency")
      .isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
      .withMessage("Valid proficiency level is required"),
    body("acquiredDuring")
      .isIn(["BEFORE_TRAINING", "DURING_TRAINING"])
      .withMessage("Valid acquisition period is required"),
  ],
  validate,
  addSkill
);

router.put(
  "/:id/skills/:skillId",
  authenticate,
  // checkPermission("candidates", "update"),
  updateSkill
);

router.delete(
  "/:id/skills/:skillId",
  authenticate,
  // checkPermission("candidates", "update"),
  deleteSkill
);

// Generate client profile
router.get(
  "/:id/client-profile",
  authenticate,
  // checkPermission("candidates", "view"),
  param("id").isMongoId().withMessage("Invalid candidate ID format"),
  validate,
  generateClientProfile
);

export default router;
