import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

const Permission = mongoose.model('Permission', permissionSchema);
const UserPermission = mongoose.model('UserPermission', userPermissionSchema);
const User = mongoose.model('User', userSchema);

const travelLogPermissions = [
  { name: 'View Employee Travel Logs', description: 'Can view employee travel/work logs', resource: 'employeeTravelLogs', action: 'view' },
  { name: 'Create Employee Travel Logs', description: 'Can create employee travel/work logs', resource: 'employeeTravelLogs', action: 'create' },
  { name: 'Update Employee Travel Logs', description: 'Can update employee travel/work logs', resource: 'employeeTravelLogs', action: 'update' },
  { name: 'Delete Employee Travel Logs', description: 'Can delete employee travel/work logs', resource: 'employeeTravelLogs', action: 'delete' },
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

async function seedEmployeeTravelLogPermissions() {
  console.log('🚌 Starting Employee Travel Log Permissions Seeder...');
  console.log('=====================================');
  try {
    const connected = await connectToDatabase();
    if (!connected) {
      console.log('💡 Please check your MongoDB connection and try again.');
      return;
    }
    console.log('🔍 Checking for existing travel log permissions...');
    const existingPermissions = await Permission.find({ resource: 'employeeTravelLogs' });
    if (existingPermissions.length > 0) {
      console.log('✅ Travel log permissions already exist:');
      existingPermissions.forEach((permission, index) => {
        console.log(`   ${index + 1}. ${permission.name} (${permission.resource}.${permission.action})`);
      });
      console.log('⚠️  Skipping creation. Use --force to recreate.');
      return;
    }
    console.log('🔄 Creating travel log permissions...');
    const createdPermissions = await Permission.insertMany(travelLogPermissions);
    console.log(`✅ Successfully created ${createdPermissions.length} travel log permissions`);
    console.log('👤 Looking for users to assign permissions...');
    const adminEmails = ['admin@matrixmedys.com', 'admin@techcorp.com'];
    let targetUser = null;
    for (const email of adminEmails) {
      targetUser = await User.findOne({ email });
      if (targetUser) {
        console.log(`👤 Found admin user: ${targetUser.email}`);
        break;
      }
    }
    if (!targetUser) {
      targetUser = await User.findOne().sort({ createdAt: 1 });
      if (targetUser) {
        console.log(`👤 Using first user: ${targetUser.email}`);
      }
    }
    if (targetUser) {
      console.log('🎯 Assigning permissions to user...');
      const userPermissions = createdPermissions.map(permission => ({
        userId: targetUser._id,
        permissionId: permission._id,
      }));
      try {
        await UserPermission.insertMany(userPermissions);
        console.log(`✅ Successfully assigned travel log permissions to: ${targetUser.email}`);
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
    console.log('=====================================');
    console.log('🎉 Employee Travel Log Permissions Seeder Completed!');
    console.log('=====================================');
    console.log('📋 Created Permissions:');
    createdPermissions.forEach((permission, index) => {
      console.log(`   ${index + 1}. ${permission.name}`);
      console.log(`      Resource: ${permission.resource}`);
      console.log(`      Action: ${permission.action}`);
      console.log(`      Description: ${permission.description}`);
      console.log('');
    });
    console.log('🚀 You can now use Employee Travel Log Management features!');
    console.log('🌐 Access the frontend at: http://localhost:5173');
    console.log('=====================================');
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    console.error('Error details:', error.message);
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

seedEmployeeTravelLogPermissions(); 