import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// User Schema (match your existing schema)
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "user", "moderator"],
      default: "user",
    },
    permissions: [
      {
        type: String,
        enum: [
          "users.view",
          "users.create",
          "users.edit",
          "users.delete",
          "states.view",
          "states.create",
          "states.edit",
          "states.delete",
          "admin.panel",
          "system.settings",
        ],
      },
    ],
    location: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    employeeNumber: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/matrixmedys"
    );
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: "admin@matrixmedys.com" }, { role: "admin" }],
    });

    if (existingAdmin) {
      console.log("Admin user already exists:");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Name: ${existingAdmin.name}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash("Admin@123", saltRounds);

    // Create admin user
    const adminUser = new User({
      name: "System Administrator",
      email: "admin@matrixmedys.com",
      password: hashedPassword,
      role: "admin",
      permissions: [
        "users.view",
        "users.create",
        "users.edit",
        "users.delete",
        "states.view",
        "states.create",
        "states.edit",
        "states.delete",
        "admin.panel",
        "system.settings",
      ],
      location: "BANGALORE",
      designation: "ADMIN",
      employeeNumber: "MMPL-001",
      contactNumber: "9809897867",
      isActive: true,
    });

    await adminUser.save();

    console.log("✅ Admin user created successfully!");
    console.log("=====================================");
    console.log("Admin Login Credentials:");
    console.log("Email: admin@matrixmedys.com");
    console.log("Password: Admin@123");
    console.log("Role: admin");
    console.log("=====================================");
    console.log("⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);

    if (error.code === 11000) {
      console.log("User with this email already exists.");
    }
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
createAdminUser();
