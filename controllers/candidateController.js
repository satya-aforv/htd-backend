import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all candidates with filtering and pagination
export const getAllCandidates = async (req, res) => {
  console.log("target hit");
  try {
    const {
      page = 1,
      limit = 10,
      status,
      skill,
      experience,
      hasGaps,
      search,
    } = req.query;

    const query = { isActive: true }; // Only fetch active candidates

    // Role-based access control
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      // Example: if a user should only see candidates they are associated with
      // This assumes a field on the candidate schema linking them to a user, e.g., 'recruiterId'
      // query.recruiterId = req.user.id;
    }

    // Apply filters
    if (status) query.status = status;
    if (skill) query["skills.name"] = { $regex: skill, $options: "i" };
    if (experience) {
      const [expType, expMonths] = experience.split(":");
      if (expType && expMonths) {
        query["experience.type"] = expType;
      }
    }
    if (hasGaps === "true") query.careerGaps = { $exists: true, $ne: [] };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { candidateId: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: "user",
    };

    const candidates = await Candidate.find(query)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort)
      .populate(options.populate);

    const total = await Candidate.countDocuments(query);
    const totalInDb = await Candidate.countDocuments({});

    console.log(`Total candidates in DB: ${totalInDb}`);
    console.log(`Query: ${JSON.stringify(query)}`);
    console.log(`Active candidates found: ${total}`);

    res.status(200).json({
      candidates,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      totalCandidates: total,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get candidate by ID
export const getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate("user");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json(candidate);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new candidate
export const createCandidate = async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      alternateContactNumber,
      dateOfBirth,
      gender,
      address,
      candidateId,
      user,
    } = req.body;

    // Check if candidate with email already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      return res
        .status(400)
        .json({ message: "Candidate with this email already exists" });
    }

    // Generate candidate ID if not provided
    const generatedCandidateId =
      candidateId || `HTDC-${Date.now().toString().slice(-6)}`;

    const newCandidate = new Candidate({
      name,
      email,
      contactNumber,
      alternateContactNumber,
      dateOfBirth,
      gender,
      address,
      candidateId: generatedCandidateId,
      user,
      status: "HIRED",
    });

    await newCandidate.save();

    res.status(201).json({
      message: "Candidate created successfully",
      candidate: newCandidate,
    });
  } catch (error) {
    console.error("Error creating candidate:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update candidate
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating certain fields directly
    delete updateData.candidateId;
    delete updateData.user;

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({
      message: "Candidate updated successfully",
      candidate,
    });
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete candidate
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findByIdAndDelete(id);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Upload candidate document
export const uploadCandidateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Create document upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, "../uploads/candidate-documents");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move file to permanent location
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${candidate.candidateId}-${type}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    fs.renameSync(req.file.path, filePath);

    // Add document to candidate
    const documentUrl = `/uploads/candidate-documents/${fileName}`;
    candidate.documents.push({
      type,
      url: documentUrl,
      description,
      uploadedAt: new Date(),
    });

    await candidate.save();

    res.status(200).json({
      message: "Document uploaded successfully",
      document: candidate.documents[candidate.documents.length - 1],
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get candidate documents
export const getCandidateDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json(candidate.documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Education management
export const addEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const educationData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.education.push(educationData);
    await candidate.save();

    res.status(201).json({
      message: "Education added successfully",
      education: candidate.education[candidate.education.length - 1],
    });
  } catch (error) {
    console.error("Error adding education:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateEducation = async (req, res) => {
  try {
    const { id, educationId } = req.params;
    const updateData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const educationIndex = candidate.education.findIndex(
      (edu) => edu._id.toString() === educationId
    );

    if (educationIndex === -1) {
      return res.status(404).json({ message: "Education record not found" });
    }

    // Update education fields
    Object.keys(updateData).forEach((key) => {
      candidate.education[educationIndex][key] = updateData[key];
    });

    await candidate.save();

    res.status(200).json({
      message: "Education updated successfully",
      education: candidate.education[educationIndex],
    });
  } catch (error) {
    console.error("Error updating education:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteEducation = async (req, res) => {
  try {
    const { id, educationId } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.education = candidate.education.filter(
      (edu) => edu._id.toString() !== educationId
    );

    await candidate.save();

    res.status(200).json({ message: "Education record deleted successfully" });
  } catch (error) {
    console.error("Error deleting education:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Experience management
export const addExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const experienceData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.experience.push(experienceData);
    await candidate.save();

    res.status(201).json({
      message: "Experience added successfully",
      experience: candidate.experience[candidate.experience.length - 1],
    });
  } catch (error) {
    console.error("Error adding experience:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateExperience = async (req, res) => {
  try {
    const { id, experienceId } = req.params;
    const updateData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const experienceIndex = candidate.experience.findIndex(
      (exp) => exp._id.toString() === experienceId
    );

    if (experienceIndex === -1) {
      return res.status(404).json({ message: "Experience record not found" });
    }

    // Update experience fields
    Object.keys(updateData).forEach((key) => {
      candidate.experience[experienceIndex][key] = updateData[key];
    });

    await candidate.save();

    res.status(200).json({
      message: "Experience updated successfully",
      experience: candidate.experience[experienceIndex],
    });
  } catch (error) {
    console.error("Error updating experience:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteExperience = async (req, res) => {
  try {
    const { id, experienceId } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.experience = candidate.experience.filter(
      (exp) => exp._id.toString() !== experienceId
    );

    await candidate.save();

    res.status(200).json({ message: "Experience record deleted successfully" });
  } catch (error) {
    console.error("Error deleting experience:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Career Gap management
export const addCareerGap = async (req, res) => {
  try {
    const { id } = req.params;
    const gapData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.careerGaps.push(gapData);
    await candidate.save();

    res.status(201).json({
      message: "Career gap added successfully",
      careerGap: candidate.careerGaps[candidate.careerGaps.length - 1],
    });
  } catch (error) {
    console.error("Error adding career gap:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateCareerGap = async (req, res) => {
  try {
    const { id, gapId } = req.params;
    const updateData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const gapIndex = candidate.careerGaps.findIndex(
      (gap) => gap._id.toString() === gapId
    );

    if (gapIndex === -1) {
      return res.status(404).json({ message: "Career gap record not found" });
    }

    // Update career gap fields
    Object.keys(updateData).forEach((key) => {
      candidate.careerGaps[gapIndex][key] = updateData[key];
    });

    await candidate.save();

    res.status(200).json({
      message: "Career gap updated successfully",
      careerGap: candidate.careerGaps[gapIndex],
    });
  } catch (error) {
    console.error("Error updating career gap:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteCareerGap = async (req, res) => {
  try {
    const { id, gapId } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.careerGaps = candidate.careerGaps.filter(
      (gap) => gap._id.toString() !== gapId
    );

    await candidate.save();

    res.status(200).json({ message: "Career gap record deleted successfully" });
  } catch (error) {
    console.error("Error deleting career gap:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Skill management
export const addSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const skillData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.skills.push(skillData);
    await candidate.save();

    res.status(201).json({
      message: "Skill added successfully",
      skill: candidate.skills[candidate.skills.length - 1],
    });
  } catch (error) {
    console.error("Error adding skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;
    const updateData = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const skillIndex = candidate.skills.findIndex(
      (skill) => skill._id.toString() === skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({ message: "Skill not found" });
    }

    // Update skill fields
    Object.keys(updateData).forEach((key) => {
      candidate.skills[skillIndex][key] = updateData[key];
    });

    await candidate.save();

    res.status(200).json({
      message: "Skill updated successfully",
      skill: candidate.skills[skillIndex],
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    candidate.skills = candidate.skills.filter(
      (skill) => skill._id.toString() !== skillId
    );

    await candidate.save();

    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error deleting skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Generate client profile
export const generateClientProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const clientProfile = candidate.generateClientProfile();

    res.status(200).json(clientProfile);
  } catch (error) {
    console.error("Error generating client profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
