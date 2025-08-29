import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Permission from "../models/Permission.js";
import User from "../models/User.js";
import UserPermission from "../models/UserPermission.js";
import State from "../models/State.js";
import connectDB from "../config/database.js";
import dotenv from "dotenv";
import { seedPrinciples } from "./principleSeeder.js";
import { seedProducts } from "./productSeeder.js";

dotenv.config();

// Permissions data
const permissions = [
  // States permissions
  {
    name: "View States",
    description: "Can view states list and details",
    resource: "states",
    action: "view",
  },
  {
    name: "Create States",
    description: "Can create new states",
    resource: "states",
    action: "create",
  },
  {
    name: "Update States",
    description: "Can update existing states",
    resource: "states",
    action: "update",
  },
  {
    name: "Delete States",
    description: "Can delete states",
    resource: "states",
    action: "delete",
  },

  // Users permissions
  {
    name: "View Users",
    description: "Can view users list and details",
    resource: "users",
    action: "view",
  },
  {
    name: "Create Users",
    description: "Can create new users",
    resource: "users",
    action: "create",
  },
  {
    name: "Update Users",
    description: "Can update existing users",
    resource: "users",
    action: "update",
  },
  {
    name: "Delete Users",
    description: "Can delete users",
    resource: "users",
    action: "delete",
  },

  // Products permissions
  {
    name: "View Products",
    description: "Can view products list and details",
    resource: "products",
    action: "view",
  },
  {
    name: "Create Products",
    description: "Can create new products",
    resource: "products",
    action: "create",
  },
  {
    name: "Update Products",
    description: "Can update existing products",
    resource: "products",
    action: "update",
  },
  {
    name: "Delete Products",
    description: "Can delete products",
    resource: "products",
    action: "delete",
  },
];

// Indian states data
const indianStates = [
  // States
  {
    name: "Andhra Pradesh",
    code: "AP",
    country: "India",
    capital: "Amaravati",
    population: 49386799,
    area: 162968,
  },
  {
    name: "Arunachal Pradesh",
    code: "AR",
    country: "India",
    capital: "Itanagar",
    population: 1383727,
    area: 83743,
  },
  {
    name: "Assam",
    code: "AS",
    country: "India",
    capital: "Dispur",
    population: 31205576,
    area: 78438,
  },
  {
    name: "Bihar",
    code: "BR",
    country: "India",
    capital: "Patna",
    population: 104099452,
    area: 94163,
  },
  {
    name: "Chhattisgarh",
    code: "CG",
    country: "India",
    capital: "Raipur",
    population: 25545198,
    area: 135192,
  },
  {
    name: "Goa",
    code: "GA",
    country: "India",
    capital: "Panaji",
    population: 1458545,
    area: 3702,
  },
  {
    name: "Gujarat",
    code: "GJ",
    country: "India",
    capital: "Gandhinagar",
    population: 60439692,
    area: 196244,
  },
  {
    name: "Haryana",
    code: "HR",
    country: "India",
    capital: "Chandigarh",
    population: 25351462,
    area: 44212,
  },
  {
    name: "Himachal Pradesh",
    code: "HP",
    country: "India",
    capital: "Shimla",
    population: 6864602,
    area: 55673,
  },
  {
    name: "Jharkhand",
    code: "JH",
    country: "India",
    capital: "Ranchi",
    population: 32988134,
    area: 79716,
  },
  {
    name: "Karnataka",
    code: "KA",
    country: "India",
    capital: "Bengaluru",
    population: 61095297,
    area: 191791,
  },
  {
    name: "Kerala",
    code: "KL",
    country: "India",
    capital: "Thiruvananthapuram",
    population: 33406061,
    area: 38852,
  },
  {
    name: "Madhya Pradesh",
    code: "MP",
    country: "India",
    capital: "Bhopal",
    population: 72626809,
    area: 308245,
  },
  {
    name: "Maharashtra",
    code: "MH",
    country: "India",
    capital: "Mumbai",
    population: 112374333,
    area: 307713,
  },
  {
    name: "Manipur",
    code: "MN",
    country: "India",
    capital: "Imphal",
    population: 2855794,
    area: 22327,
  },
  {
    name: "Meghalaya",
    code: "ML",
    country: "India",
    capital: "Shillong",
    population: 2966889,
    area: 22429,
  },
  {
    name: "Mizoram",
    code: "MZ",
    country: "India",
    capital: "Aizawl",
    population: 1097206,
    area: 21081,
  },
  {
    name: "Nagaland",
    code: "NL",
    country: "India",
    capital: "Kohima",
    population: 1978502,
    area: 16579,
  },
  {
    name: "Odisha",
    code: "OR",
    country: "India",
    capital: "Bhubaneswar",
    population: 42009051,
    area: 155707,
  },
  {
    name: "Punjab",
    code: "PB",
    country: "India",
    capital: "Chandigarh",
    population: 27743338,
    area: 50362,
  },
  {
    name: "Rajasthan",
    code: "RJ",
    country: "India",
    capital: "Jaipur",
    population: 68548437,
    area: 342239,
  },
  {
    name: "Sikkim",
    code: "SK",
    country: "India",
    capital: "Gangtok",
    population: 610577,
    area: 7096,
  },
  {
    name: "Tamil Nadu",
    code: "TN",
    country: "India",
    capital: "Chennai",
    population: 72147030,
    area: 130060,
  },
  {
    name: "Telangana",
    code: "TS",
    country: "India",
    capital: "Hyderabad",
    population: 35003674,
    area: 112077,
  },
  {
    name: "Tripura",
    code: "TR",
    country: "India",
    capital: "Agartala",
    population: 3673917,
    area: 10486,
  },
  {
    name: "Uttar Pradesh",
    code: "UP",
    country: "India",
    capital: "Lucknow",
    population: 199812341,
    area: 240928,
  },
  {
    name: "Uttarakhand",
    code: "UK",
    country: "India",
    capital: "Dehradun",
    population: 10086292,
    area: 53483,
  },
  {
    name: "West Bengal",
    code: "WB",
    country: "India",
    capital: "Kolkata",
    population: 91276115,
    area: 88752,
  },

  // Union Territories
  {
    name: "Andaman and Nicobar Islands",
    code: "AN",
    country: "India",
    capital: "Port Blair",
    population: 380581,
    area: 8249,
  },
  {
    name: "Chandigarh",
    code: "CH",
    country: "India",
    capital: "Chandigarh",
    population: 1055450,
    area: 114,
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    code: "DH",
    country: "India",
    capital: "Daman",
    population: 585764,
    area: 603,
  },
  {
    name: "Delhi",
    code: "DL",
    country: "India",
    capital: "New Delhi",
    population: 16787941,
    area: 1484,
  },
  {
    name: "Jammu and Kashmir",
    code: "JK",
    country: "India",
    capital: "Srinagar (Summer), Jammu (Winter)",
    population: 12267013,
    area: 55673,
  },
  {
    name: "Ladakh",
    code: "LA",
    country: "India",
    capital: "Leh",
    population: 274000,
    area: 59146,
  },
  {
    name: "Lakshadweep",
    code: "LD",
    country: "India",
    capital: "Kavaratti",
    population: 64473,
    area: 32,
  },
  {
    name: "Puducherry",
    code: "PY",
    country: "India",
    capital: "Puducherry",
    population: 1247953,
    area: 492,
  },
];

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: "admin@matrixmedys.com" }, { role: "admin" }],
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return existingAdmin;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash("Admin@123", 12);

    // Create admin user
    const adminUser = new User({
      name: "System Administrator",
      email: "admin@matrixmedys.com",
      password: hashedPassword,
      gender: "MALE",
      location: "BANGALORE",
      designation: "ADMIN",
      employeeNumber: "MMPL-001",
      contactNumber: "9809897867",
      isActive: true,
      role: "admin",
      status: "active",
      address: "BANGALORE",
      profileImage: "https://matrixmedys.com/images/avatars/avatar-1.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@matrixmedys.com | 🔑 Password: Admin@123");

    return adminUser;
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    throw error;
  }
}

async function seedPermissions() {
  try {
    // Clear existing permissions
    await Permission.deleteMany({});
    await UserPermission.deleteMany({});

    // Create permissions
    const createdPermissions = await Permission.insertMany(permissions);
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    return createdPermissions;
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    throw error;
  }
}

async function assignPermissionsToAdmin(adminUser, createdPermissions) {
  try {
    // Give admin user all permissions
    const userPermissions = createdPermissions.map((permission) => ({
      userId: adminUser._id,
      permissionId: permission._id,
    }));

    await UserPermission.insertMany(userPermissions);
    console.log(
      `✅ Assigned all permissions to admin user: ${adminUser.email}`
    );
  } catch (error) {
    console.error("❌ Error assigning permissions:", error);
    throw error;
  }
}

async function seedStates(adminUser) {
  try {
    // Clear existing states
    await State.deleteMany({});

    // Add createdBy field to each state
    const statesWithCreator = indianStates.map((state) => ({
      ...state,
      isActive: true,
      createdBy: adminUser._id,
    }));

    // Insert all Indian states
    const insertedStates = await State.insertMany(statesWithCreator);
    console.log(
      `✅ Created ${insertedStates.length} Indian states and union territories`
    );

    // Display statistics
    const totalPopulation = insertedStates.reduce(
      (sum, state) => sum + (state.population || 0),
      0
    );
    const totalArea = insertedStates.reduce(
      (sum, state) => sum + (state.area || 0),
      0
    );

    console.log(`📊 Total Population: ${totalPopulation.toLocaleString()}`);
    console.log(`🗺️  Total Area: ${totalArea.toLocaleString()} km²`);

    return insertedStates;
  } catch (error) {
    console.error("❌ Error seeding states:", error);
    throw error;
  }
}

async function comprehensiveSeeder() {
  try {
    await connectDB();
    console.log("🔗 Connected to MongoDB");
    console.log("=====================================");

    // Step 1: Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = await createAdminUser();

    // Step 2: Seed permissions
    console.log("🔐 Seeding permissions...");
    const createdPermissions = await seedPermissions();

    // Step 3: Assign permissions to admin
    console.log("🎯 Assigning permissions to admin...");
    await assignPermissionsToAdmin(adminUser, createdPermissions);

    // Step 4: Seed Indian states
    console.log("🇮🇳 Seeding Indian states...");
    const insertedStates = await seedStates(adminUser);

    // Step 5: Seed Principles
    console.log("🌱 Seeding principles...");
    await seedPrinciples();

    // Step 6: Seed Products
    console.log("📦 Seeding products...");
    await seedProducts();

    console.log("=====================================");
    console.log("🎉 Database seeded successfully!");
    console.log("=====================================");
    console.log("📋 Summary:");
    console.log(`   👤 Users: 1 (Admin)`);
    console.log(`   🔐 Permissions: ${createdPermissions.length}`);
    console.log(`   🏛️  States: ${insertedStates.length}`);
    console.log("   🌱 Principles: (see principle seeder output)");
    console.log("   📦 Products: (see product seeder output)");
    console.log("=====================================");
    console.log("🚀 You can now start using the application!");
    console.log("🌐 Frontend: http://localhost:5173");
    console.log("📧 Login: admin@matrixmedys.com");
    console.log("🔑 Password: Admin@123");
    console.log("=====================================");
  } catch (error) {
    console.error("💥 Comprehensive seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📤 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Export individual functions for modular use
export {
  createAdminUser,
  seedPermissions,
  assignPermissionsToAdmin,
  seedStates,
  indianStates,
};

// Run comprehensive seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveSeeder();
}

export default comprehensiveSeeder;
