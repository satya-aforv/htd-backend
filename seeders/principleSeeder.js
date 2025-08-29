import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Principle from '../models/Principle.js';
import PrincipleContact from '../models/PrincipleContact.js';
import User from '../models/User.js';
import State from '../models/State.js';

dotenv.config();

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

export async function seedPrinciples() {
  console.log('🏢 Starting Principle Seeder...');
  try {
    // Find a user and a state for demo data
    const user = await User.findOne();
    const state = await State.findOne();
    if (!user || !state) {
      console.log('⚠️  Need at least one user and one state in the database.');
      return;
    }

    // Remove existing demo principles
    await Principle.deleteMany({});
    await PrincipleContact.deleteMany({});

    // Create demo principle
    const principle = new Principle({
      name: 'Demo Principle',
      email: 'principle@example.com',
      phone: '9876543210',
      gstNumber: '22AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      gstAddress: '123 Principle Street, City',
      city: 'Demo City',
      state: state._id,
      pincode: '123456',
      isActive: true,
      createdBy: user._id,
      documents: [],
    });
    await principle.save();

    // Create demo contacts
    const contacts = [
      {
        principle: principle._id,
        departmentName: 'Admin',
        personName: 'John Doe',
        email: 'john.doe@principle.com',
        phone: '9876543211',
        address: '123 Principle Street, City',
        location: 'Main Office',
        pincode: '123456',
        isActive: true,
        createdBy: user._id,
      },
      {
        principle: principle._id,
        departmentName: 'Finance',
        personName: 'Jane Smith',
        email: 'jane.smith@principle.com',
        phone: '9876543212',
        address: '123 Principle Street, City',
        location: 'Finance Dept',
        pincode: '123456',
        isActive: true,
        createdBy: user._id,
      },
    ];
    await PrincipleContact.insertMany(contacts);

    console.log('✅ Demo Principle and contacts created successfully!');
  } catch (error) {
    console.error('❌ Seeder failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const connected = await connectToDatabase();
    if (connected) {
      await seedPrinciples();
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