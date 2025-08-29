import mongoose from 'mongoose';

export const users = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    employeeNumber: 'EMP001',
    contactNumber: '1234567890',
    location: 'Head Office',
    designation: 'Administrator',
    role: 'admin'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    employeeNumber: 'EMP002',
    contactNumber: '0987654321',
    location: 'Branch Office',
    designation: 'Trainer',
    role: 'user'
  }
];

export const candidates = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    contactNumber: '1234567890',
    alternateContactNumber: '0987654321',
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
    email: 'jane.smith@example.com',
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

export const trainings = [
  {
    candidateName: 'John Doe',
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
        trainerName: 'Admin User'
      },
      {
        name: 'Advanced Node.js',
        description: 'Deep dive into Node.js',
        technology: 'Node.js',
        duration: 45,
        startDate: new Date('2023-02-15'),
        endDate: new Date('2023-03-31'),
        status: 'IN_PROGRESS',
        trainerName: 'Admin User'
      }
    ]
  }
];

export const payments = [
  {
    candidateName: 'John Doe',
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
    candidateName: 'John Doe',
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
