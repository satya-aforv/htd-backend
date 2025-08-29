// server/seeders/productSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Principle from '../models/Principle.js';
import User from '../models/User.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';

dotenv.config();

const productPermissions = [
  { name: 'View Products', description: 'Can view product list', resource: 'products', action: 'view' },
  { name: 'Create Products', description: 'Can create products', resource: 'products', action: 'create' },
  { name: 'Update Products', description: 'Can update products', resource: 'products', action: 'update' },
  { name: 'Delete Products', description: 'Can delete products', resource: 'products', action: 'delete' },
];

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

export async function seedProducts() {
  console.log('📦 Starting Product Seeder...');
  try {
    await Product.deleteMany({});

    const principles = await Principle.find({});
    let adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });

    if (principles.length === 0) {
      console.log('⚠️ Please seed principles first.');
      return;
    }
    if (!adminUser) {
      adminUser = await User.findOne();
    }
    if (!adminUser) {
      console.error('❌ No admin user found. Please create a user first.');
      return;
    }

    const products = [
      {
        supplierName: 'Med-Supplier Inc.',
        productCode: 'MSI-001',
        principle: principles[0]._id,
        dp: 100,
        mrp: 150,
        description: 'A sample product from Med-Supplier Inc.',
        quantity: 1000,
        createdBy: adminUser._id,
      },
      {
        supplierName: 'HealthCare Pharma',
        productCode: 'HCP-001',
        principle: principles[1 % principles.length]._id,
        dp: 250,
        mrp: 300,
        description: 'A sample product from HealthCare Pharma.',
        quantity: 500,
        createdBy: adminUser._id,
      },
    ];

    await Product.insertMany(products);
    console.log('✅ Products seeded successfully');

    const existing = await Permission.find({ resource: 'products' });
    if (existing.length === 0) {
      const created = await Permission.insertMany(productPermissions);
      console.log('✅ Product permissions created');

      const userPermissions = created.map(p => ({
        userId: adminUser._id,
        permissionId: p._id,
      }));
      await UserPermission.insertMany(userPermissions);
      console.log('✅ Permissions assigned to admin:', adminUser.email);
    } else {
      console.log('ℹ️ Product permissions already exist. Skipping permission creation.');
    }

  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const connected = await connectToDatabase();
    if (connected) {
      await seedProducts();
      try {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
      } catch (disconnectError) {
        console.error('Error disconnecting:', disconnectError.message);
      }
    }
    process.exit(0);
  })();
}
