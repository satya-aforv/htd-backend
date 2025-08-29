import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

const candidatesData = [
  {
    name: 'John Doe',
    email: 'john.doe.htd@example.com',
    contactNumber: '1234567890',
    dateOfBirth: new Date('1995-05-20'),
    gender: 'MALE',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      pincode: '12345',
      country: 'USA'
    },
    candidateId: 'CAND001',
    status: 'HIRED'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith.htd@example.com',
    contactNumber: '1122334455',
    dateOfBirth: new Date('1998-08-15'),
    gender: 'FEMALE',
    address: {
      street: '456 Oak Ave',
      city: 'Somecity',
      state: 'NY',
      pincode: '54321',
      country: 'USA'
    },
    candidateId: 'CAND002',
    status: 'HIRED'
  }
];

const trainingsData = [
  {
    candidateEmail: 'john.doe.htd@example.com',
    startDate: new Date('2023-01-15'),
    expectedEndDate: new Date('2023-04-15'),
    trainingId: 'TRN001',
    status: 'IN_PROGRESS',
    modules: [
      {
        name: 'React Fundamentals',
        description: 'Introduction to React',
        technology: 'React',
        duration: 30,
        startDate: new Date('2023-01-15'),
        endDate: new Date('2023-02-14'),
        status: 'COMPLETED',
        trainerEmail: 'admin@matrixmedys.com'
      },
      {
        name: 'Advanced Node.js',
        description: 'Deep dive into Node.js',
        technology: 'Node.js',
        duration: 45,
        startDate: new Date('2023-02-15'),
        endDate: new Date('2023-03-31'),
        status: 'IN_PROGRESS',
        trainerEmail: 'admin@matrixmedys.com'
      }
    ]
  }
];

const paymentsData = [
  {
    candidateEmail: 'john.doe.htd@example.com',
    amount: 500,
    type: 'STIPEND',
    paymentDate: new Date('2023-02-01'),
    paymentMode: 'BANK_TRANSFER',
    status: 'COMPLETED',
    month: 2,
    year: 2023,
    paymentId: 'PAY001'
  },
  {
    candidateEmail: 'john.doe.htd@example.com',
    amount: 500,
    type: 'STIPEND',
    paymentDate: new Date('2023-03-01'),
    paymentMode: 'BANK_TRANSFER',
    status: 'PENDING',
    month: 3,
    year: 2023,
    paymentId: 'PAY002'
  }
];

const seedHTD = async () => {
  try {
    await connectDB();

    let adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      console.log('Admin user not found. Creating admin user...');
      adminUser = await User.create({
        name: 'System Administrator',
        email: 'admin@matrixmedys.com',
        password: 'Admin@123', // The model will hash this
        contactNumber: '9809897867',
        gender: 'MALE',
        location: 'BANGALORE',
        designation: 'ADMIN',
        employeeNumber: 'MMPL-001',
        isActive: true,
      });
      console.log('Admin user created successfully.');
    }

    try {
      console.log('Attempting to drop outdated index: personalInfo.email_1');
      await Candidate.collection.dropIndex('personalInfo.email_1');
      console.log('Successfully dropped outdated index.');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('Outdated index not found, skipping drop.');
      } else {
        console.error('Could not drop index, proceeding anyway...', error.message);
      }
    }

    // Seed Candidates
    for (const candidate of candidatesData) {
      const existingCandidate = await Candidate.findOne({ $or: [{ email: candidate.email }, { candidateId: candidate.candidateId }] });
      if (!existingCandidate) {
        await Candidate.create({ ...candidate, user: adminUser._id });
        console.log(`Created candidate: ${candidate.name}`);
      }
    }

    // Seed Trainings
    for (const training of trainingsData) {
      const existingTraining = await Training.findOne({ trainingId: training.trainingId });
      if (!existingTraining) {
        const candidate = await Candidate.findOne({ email: training.candidateEmail });
        if (candidate) {
          const modules = [];
          for (const module of training.modules) {
            const trainer = await User.findOne({ email: module.trainerEmail });
            if (trainer) {
              modules.push({ ...module, trainer: trainer._id });
            }
          }
          await Training.create({ ...training, candidate: candidate._id, modules });
          console.log(`Created training: ${training.trainingId}`);
        }
      }
    }

    // Seed Payments
    for (const payment of paymentsData) {
      const existingPayment = await Payment.findOne({ paymentId: payment.paymentId });
      if (!existingPayment) {
        const candidate = await Candidate.findOne({ email: payment.candidateEmail });
        if (candidate) {
          await Payment.create({ ...payment, candidate: candidate._id, processedBy: adminUser._id });
          console.log(`Created payment: ${payment.paymentId}`);
        }
      }
    }

    console.log('HTD seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding HTD data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

seedHTD();
