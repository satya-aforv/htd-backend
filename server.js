// server/server.js - Updated with file routes
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  securityHeaders,
  authRateLimit,
  passwordResetRateLimit,
  uploadRateLimit,
  accountLockout,
} from "./middleware/security.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.js";
import stateRoutes from "./routes/states.js";
import userRoutes from "./routes/users.js";
import permissionRoutes from "./routes/permissions.js";
import hospitalRoutes from "./routes/hospitals.js";
import dashboardRoutes from "./routes/dashboard.js";
import htdDashboardRoutes from "./routes/htdDashboard.js";
import fileRoutes from "./routes/files.js"; // New file routes
import principleRoutes from "./routes/principles.js";
import productRoutes from "./routes/products.js";
import employeeTravelLogRoutes from "./routes/employeeTravelLogs.js";
import portfolioRoutes from "./routes/portfolios.js";
import candidateRoutes from "./routes/candidates.js";
import { authenticate } from "./middleware/auth.js";
import trainingRoutes from "./routes/trainings.js";
import paymentRoutes from "./routes/payments.js";
import htdRoutes from "./routes/htd.js";
import clientProfileRoutes from "./routes/clientProfile.js";
import analyticsRoutes from "./routes/analytics.js";
import notificationRoutes from "./routes/notifications.js";
import exportRoutes from "./routes/exports.js";
import scheduledReportRoutes from "./routes/scheduledReports.js";
import schedulerService from "./services/schedulerService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Security middleware
app.use(securityHeaders);
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      /http:\/\/localhost:\d+/
    ].filter(Boolean),
    credentials: true,
  })
);

// Rate limiting - More relaxed for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // 1000 for dev, 100 for production
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
// app.use(limiter);

// More relaxed rate limiting for auth routes in development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 5 : 50, // 50 for dev, 5 for production
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes with security middleware
app.use("/api/auth", authRateLimit, accountLockout, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/files", uploadRateLimit, fileRoutes); // File management routes
app.use("/api/states", stateRoutes);
app.use("/api/users", userRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/principles", principleRoutes);
app.use("/api/products", productRoutes);
app.use("/api/employee-travel-logs", employeeTravelLogRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/htd/candidates", authenticate, candidateRoutes);
app.use("/api/htd", htdRoutes);
app.use("/api/htd/client-profile", clientProfileRoutes);
app.use("/api/htd/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/htd/exports", exportRoutes);
app.use("/api/scheduled-reports", authenticate, scheduledReportRoutes);
app.use("/api/htd/dashboard", htdDashboardRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ message: "File too large. Maximum size is 10MB." });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Unexpected file field." });
  }

  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({
    message: "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `Auth rate limit: ${
      process.env.NODE_ENV === "production" ? "5" : "50"
    } requests per 15 minutes`
  );
  console.log(`File uploads directory: ${path.join(__dirname, "uploads")}`);
  
  // Start the scheduler service
  console.log('Starting report scheduler...');
  schedulerService.start(5); // Check every 5 minutes
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  schedulerService.stop();
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  schedulerService.stop();
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});
