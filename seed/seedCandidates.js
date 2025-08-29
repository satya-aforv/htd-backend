import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Candidate from '../models/Candidate.js';
import connectDB from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedCandidates = async () => {
  await connectDB();

  try {
    const existingCandidates = await Candidate.countDocuments();
    if (existingCandidates > 0) {
      console.log('Candidates already exist. Skipping seeding.');
      return;
    }

    const candidates = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        contactNumber: '1234567890',
        dateOfBirth: new Date('1995-05-20'),
        gender: 'MALE',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'Anystate',
          pincode: '12345',
          country: 'India',
        },
        candidateId: 'CAND001',
        education: [
          {
            degree: 'Bachelor of Technology',
            institution: 'Anytown University',
            yearOfPassing: 2017,
            percentage: 85,
          },
        ],
        experience: [
          {
            type: 'IT',
            companyName: 'Tech Solutions Inc.',
            role: 'Software Engineer',
            startDate: new Date('2017-08-01'),
            endDate: new Date('2021-12-31'),
            salary: 60000,
          },
        ],
        skills: [
          {
            name: 'JavaScript',
            type: 'IT',
            proficiency: 'ADVANCED',
            acquiredDuring: 'BEFORE_TRAINING',
          },
        ],
      },
    ];

    await Candidate.insertMany(candidates);
    console.log('Candidates seeded successfully!');
  } catch (error) {
    console.error('Error seeding candidates:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedCandidates();
