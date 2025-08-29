// server/routes/dashboard.js
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { checkPermission } from "../middleware/permissions.js";
import {
  getDashboardStats,
  getRecentActivity,
} from "../controllers/dashboardController.js";

const router = express.Router();

// Dashboard routes
router.get(
  "/stats",
  authenticate,
  // checkPermission("admin", "view"),
  getDashboardStats
);
router.get(
  "/activity",
  authenticate,
  // checkPermission("admin", "view"),
  getRecentActivity
);

export default router;
