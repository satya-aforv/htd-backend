import mongoose from 'mongoose';

const employeeTravelLogSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true,
    unique: false, // Not unique, as an employee can have multiple logs
  },
  loginTime: {
    type: Date,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  workHours: {
    type: Number,
    required: true,
  },
  travelDuration: {
    type: String,
    required: true,
    trim: true,
  },
  totalTravelWorkTime: {
    type: String,
    required: true,
    trim: true,
  },
  otHours: {
    type: Number,
    default: 0,
  },
  startFrom: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  distanceKm: {
    type: Number,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

export default mongoose.model('EmployeeTravelLog', employeeTravelLogSchema); 