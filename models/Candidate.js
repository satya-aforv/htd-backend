import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  degree: {
    type: String,
    required: true,
    trim: true,
  },
  institution: {
    type: String,
    required: true,
    trim: true,
  },
  fieldOfStudy: {
    type: String,
    required: true,
    trim: true,
  },
  yearOfPassing: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  certificateUrl: {
    type: String,
    trim: true,
  },
});

const experienceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["IT", "NON-IT"],
    required: true,
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  salary: {
    type: Number,
    required: true,
  },
  documentUrl: {
    type: String,
    trim: true,
  },
});

const careerGapSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
});

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["IT", "NON-IT"],
    required: true,
  },
  proficiency: {
    type: String,
    enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
    default: "BEGINNER",
  },
  acquiredDuring: {
    type: String,
    enum: ["BEFORE_TRAINING", "DURING_TRAINING"],
    required: true,
  },
});

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "RESUME",
      "OFFER_LETTER",
      "RELIEVING_LETTER",
      "BANK_STATEMENT",
      "ID_PROOF",
      "OTHER",
    ],
    required: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
  },
});

const candidateSchema = new mongoose.Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    alternateContactNumber: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      required: true,
    },
    address: {
      street: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
        default: "India",
      },
    },

    // Additional profile fields
    highestQualification: {
      type: String,
      trim: true,
    },
    previousSalary: {
      type: Number,
      default: 0,
    },
    expectedSalary: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Education Details
    education: [educationSchema],

    // Experience Details
    experience: [experienceSchema],

    // Career Gaps
    careerGaps: [careerGapSchema],

    // Skills
    skills: [skillSchema],

    // Documents
    documents: [documentSchema],

    // Status
    status: {
      type: String,
      enum: ["HIRED", "IN_TRAINING", "DEPLOYED", "INACTIVE"],
      default: "HIRED",
    },

    // Candidate ID
    candidateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // User account reference (if candidate has login access)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total IT and Non-IT experience
candidateSchema.methods.calculateExperience = function () {
  const itExperience = this.experience
    .filter((exp) => exp.type === "IT")
    .reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      const diffTime = Math.abs(end - start);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      return total + diffMonths;
    }, 0);

  const nonItExperience = this.experience
    .filter((exp) => exp.type === "NON-IT")
    .reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      const diffTime = Math.abs(end - start);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      return total + diffMonths;
    }, 0);

  return {
    itExperienceMonths: itExperience,
    nonItExperienceMonths: nonItExperience,
    totalExperienceMonths: itExperience + nonItExperience,
  };
};

// Generate client-facing profile
candidateSchema.methods.generateClientProfile = function () {
  const experience = this.calculateExperience();

  return {
    name: this.name,
    candidateId: this.candidateId,
    skills: this.skills,
    education: this.education,
    experience: this.experience,
    totalExperience: {
      it: `${Math.floor(experience.itExperienceMonths / 12)} years, ${
        experience.itExperienceMonths % 12
      } months`,
      nonIt: `${Math.floor(experience.nonItExperienceMonths / 12)} years, ${
        experience.nonItExperienceMonths % 12
      } months`,
      total: `${Math.floor(experience.totalExperienceMonths / 12)} years, ${
        experience.totalExperienceMonths % 12
      } months`,
    },
    careerGaps: this.careerGaps,
    status: this.status,
  };
};

export default mongoose.model("Candidate", candidateSchema);
