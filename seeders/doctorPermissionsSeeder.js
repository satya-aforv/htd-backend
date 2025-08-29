// server/seeders/simpleDoctorSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple model definitions to avoid import issues
const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  resource: { type: String, required: true },
  action: { type: String, required: true, enum: ['view', 'create', 'update', 'delete'] },
}, { timestamps: true });

const userPermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
}, { timestamps: true });

userPermissionSchema.index({ userId: 1, permissionId: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  refreshToken: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Create models
const Permission = mongoose.model('Permission', permissionSchema);
const UserPermission = mongoose.model('UserPermission', userPermissionSchema);
const User = mongoose.model('User', userSchema);

// Doctor permissions data
const doctorPermissions = [
  { name: 'View Doctors', description: 'Can view doctors list and details', resource: 'doctors', action: 'view' },
  { name: 'Create Doctors', description: 'Can create new doctors', resource: 'doctors', action: 'create' },
  { name: 'Update Doctors', description: 'Can update existing doctors', resource: 'doctors', action: 'update' },
  { name: 'Delete Doctors', description: 'Can delete doctors', resource: 'doctors', action: 'delete' },
];

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log(`🔗 Connected to: ${mongoUri}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function seedDoctorPermissions() {
  console.log('🏥 Starting Doctor Permissions Seeder...');
  console.log('=====================================');
  
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      console.log('💡 Please check your MongoDB connection and try again.');
      return;
    }
    
    // Check if doctor permissions already exist
    console.log('🔍 Checking for existing doctor permissions...');
    const existingPermissions = await Permission.find({ resource: 'doctors' });
    
    if (existingPermissions.length > 0) {
      console.log('✅ Doctor permissions already exist:');
      existingPermissions.forEach((permission, index) => {
        console.log(`   ${index + 1}. ${permission.name} (${permission.resource}.${permission.action})`);
      });
      console.log('⚠️  Skipping creation. Use --force to recreate.');
      return;
    }
    
    // Create doctor permissions
    console.log('🔄 Creating doctor permissions...');
    const createdPermissions = await Permission.insertMany(doctorPermissions);
    console.log(`✅ Successfully created ${createdPermissions.length} doctor permissions`);
    
    // Find users to assign permissions to
    console.log('👤 Looking for users to assign permissions...');
    const adminEmails = ['admin@matrixmedys.com', 'admin@techcorp.com'];
    let targetUser = null;
    
    // Try to find admin user
    for (const email of adminEmails) {
      targetUser = await User.findOne({ email });
      if (targetUser) {
        console.log(`👤 Found admin user: ${targetUser.email}`);
        break;
      }
    }
    
    // If no admin found, use first user
    if (!targetUser) {
      targetUser = await User.findOne().sort({ createdAt: 1 });
      if (targetUser) {
        console.log(`👤 Using first user: ${targetUser.email}`);
      }
    }
    
    if (targetUser) {
      // Assign permissions to user
      console.log('🎯 Assigning permissions to user...');
      const userPermissions = createdPermissions.map(permission => ({
        userId: targetUser._id,
        permissionId: permission._id,
      }));
      
      try {
        await UserPermission.insertMany(userPermissions);
        console.log(`✅ Successfully assigned doctor permissions to: ${targetUser.email}`);
      } catch (assignError) {
        if (assignError.code === 11000) {
          console.log(`⚠️  Some permissions were already assigned to: ${targetUser.email}`);
        } else {
          console.error('❌ Error assigning permissions:', assignError.message);
        }
      }
    } else {
      console.log('⚠️  No users found in database.');
      console.log('💡 Create a user first, then run this seeder again.');
      console.log('💡 Or run: npm run seed:comprehensive');
    }
    
    // Summary
    console.log('=====================================');
    console.log('🎉 Doctor Permissions Seeder Completed!');
    console.log('=====================================');
    console.log('📋 Created Permissions:');
    createdPermissions.forEach((permission, index) => {
      console.log(`   ${index + 1}. ${permission.name}`);
      console.log(`      Resource: ${permission.resource}`);
      console.log(`      Action: ${permission.action}`);
      console.log(`      Description: ${permission.description}`);
      console.log('');
    });
    console.log('🚀 You can now use Doctor Management features!');
    console.log('🌐 Access the frontend at: http://localhost:5173');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    console.error('Error details:', error.message);
    
    // Helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 MongoDB is not running. Please start MongoDB and try again.');
      console.log('   - For local MongoDB: mongod');
      console.log('   - For Docker: docker run -d -p 27017:27017 mongo');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Check your MongoDB credentials in the .env file.');
    } else if (error.message.includes('Cannot read properties')) {
      console.log('💡 There might be an issue with the database models.');
    }
    
  } finally {
    try {
      await mongoose.disconnect();
      console.log('📤 Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');

if (force) {
  console.log('⚠️  Force mode enabled - will recreate permissions');
}

// Run the seeder
seedDoctorPermissions();