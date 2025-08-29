import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { users, candidates, trainings, payments } from './data.js';

dotenv.config();

// --- Schemas and Models Definition ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  employeeNumber: { type: String, required: true, unique: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'MALE' },
  location: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  refreshToken: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const educationSchema = new mongoose.Schema({ degree: { type: String, required: true }, institution: { type: String, required: true }, yearOfPassing: { type: Number, required: true }, percentage: { type: Number, required: true } });
const experienceSchema = new mongoose.Schema({ type: { type: String, enum: ['IT', 'NON-IT'], required: true }, companyName: { type: String, required: true }, role: { type: String, required: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, salary: { type: Number, required: true } });
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  contactNumber: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
  address: { street: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
  education: [educationSchema],
  experience: [experienceSchema],
  status: { type: String, enum: ['HIRED', 'IN_TRAINING', 'DEPLOYED', 'INACTIVE'], default: 'HIRED' },
  candidateId: { type: String, required: true, unique: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Candidate = mongoose.model('Candidate', candidateSchema);

const moduleSchema = new mongoose.Schema({ name: { type: String, required: true }, technology: { type: String, required: true }, duration: { type: Number, required: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } });
const trainingSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  startDate: { type: Date, required: true },
  expectedEndDate: { type: Date, required: true },
  status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DISCONTINUED'], default: 'PLANNED' },
  modules: [moduleSchema],
  trainingId: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });
const Training = mongoose.model('Training', trainingSchema);

const paymentSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['STIPEND', 'SALARY', 'BONUS', 'REIMBURSEMENT', 'OTHER'], required: true },
  paymentDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'PENDING' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentId: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });
const Payment = mongoose.model('Payment', paymentSchema);

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB Connected...');

    console.log('Seeding database non-destructively...');

    const userMap = {};
    for (const userData of users) {
      const { _id, ...updateData } = userData;
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(updateData.password, salt);

      const user = await User.findOneAndUpdate(
        { email: updateData.email },
        { ...updateData, password: hashedPassword },
        { new: true, upsert: true, runValidators: true }
      );
      console.log(`Upserted user: ${user.email}`);
      userMap[user.name] = user._id;
    }

    const candidateMap = {};
    for (const candidateData of candidates) {
      let candidate = await Candidate.findOne({ $or: [{ email: candidateData.email }, { candidateId: candidateData.candidateId }] });
      if (!candidate) {
        candidate = await Candidate.create({ ...candidateData, user: userMap['Admin User'] });
        console.log(`Created candidate: ${candidate.name}`);
      }
      candidateMap[candidate.name] = candidate._id;
    }

    for (const trainingData of trainings) {
      let training = await Training.findOne({ trainingId: trainingData.trainingId });
      if (!training) {
        const candidateId = candidateMap[trainingData.candidateName];
        const modulesWithTrainerIds = trainingData.modules.map(m => ({ ...m, trainer: userMap[m.trainerName] }));
        training = await Training.create({ ...trainingData, candidate: candidateId, modules: modulesWithTrainerIds });
        console.log(`Created training: ${training.trainingId}`);
      }
    }

    for (const paymentData of payments) {
      let payment = await Payment.findOne({ paymentId: paymentData.paymentId });
      if (!payment) {
        const candidateId = candidateMap[paymentData.candidateName];
        const processedById = userMap['Admin User'];
        payment = await Payment.create({ ...paymentData, candidate: candidateId, processedBy: processedById });
        console.log(`Created payment: ${payment.paymentId}`);
      }
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

seedDB();
