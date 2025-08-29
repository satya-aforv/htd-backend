// server/seeders/portfolioSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mini model definitions to avoid import issues
const permissionSchema = new mongoose.Schema({
  name: String,
  description: String,
  resource: String,
  action: String,
}, { timestamps: true });

const userPermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
}, { timestamps: true });

const portfolioSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isActive: Boolean,
}, { timestamps: true });

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
const User = mongoose.model('User', userSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const UserPermission = mongoose.model('UserPermission', userPermissionSchema);

// Portfolio permissions
const portfolioPermissions = [
  { name: 'View Portfolios', description: 'Can view portfolio list', resource: 'portfolios', action: 'view' },
  { name: 'Create Portfolios', description: 'Can create portfolios', resource: 'portfolios', action: 'create' },
  { name: 'Update Portfolios', description: 'Can update portfolios', resource: 'portfolios', action: 'update' },
  { name: 'Delete Portfolios', description: 'Can delete portfolios', resource: 'portfolios', action: 'delete' },
];

const seedPortfoliosWithPermissions = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    await Portfolio.deleteMany();

    let adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      adminUser = await User.findOne();
    }

    if (!adminUser) {
      console.error('❌ No admin user found. Please create a user first.');
      return;
    }

    const portfolios = [
      {
        name: 'Cardiology Devices',
        description: 'Portfolio for heart-related equipment',
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
      {
        name: 'Orthopedic Solutions',
        description: 'Orthopedic implants and tools',
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      },
    ];

    await Portfolio.insertMany(portfolios);
    console.log('✅ Portfolios seeded');

    const existing = await Permission.find({ resource: 'portfolios' });
    if (existing.length === 0) {
      const created = await Permission.insertMany(portfolioPermissions);
      console.log('✅ Portfolio permissions created');

      const userPermissions = created.map(p => ({
        userId: adminUser._id,
        permissionId: p._id,
      }));
      await UserPermission.insertMany(userPermissions);
      console.log('✅ Permissions assigned to admin:', adminUser.email);
    } else {
      console.log('ℹ️ Portfolio permissions already exist. Skipping permission creation.');
    }
  } catch (err) {
    console.error('❌ Error seeding portfolios:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected');
    process.exit();
  }
};

seedPortfoliosWithPermissions();
