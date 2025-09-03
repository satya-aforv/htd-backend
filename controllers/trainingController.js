import Training from "../models/Training.js";
import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";

// Get all trainings with filtering and pagination
export const getAllTrainings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, technology, search } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (technology)
      query["modules.technology"] = { $regex: technology, $options: "i" };
    if (search) {
      query.$or = [
        { trainingId: { $regex: search, $options: "i" } },
        { "modules.name": { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };

    const pipeline = [
      { $match: query },
      { $sort: options.sort },
      { $skip: (options.page - 1) * options.limit },
      { $limit: options.limit },
      {
        $lookup: {
          from: "candidates",
          localField: "candidate",
          foreignField: "_id",
          as: "candidate",
        },
      },
      { $unwind: { path: "$candidate", preserveNullAndEmptyArrays: true } },
    ];

    const trainings = await Training.aggregate(pipeline);

    const total = await Training.countDocuments(query);

    res.status(200).json({
      trainings,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      totalTrainings: total,
    });
  } catch (error) {
    console.error("Error fetching trainings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get training by ID
export const getTrainingById = async (req, res) => {
  try {
    const training = await Training.findById(req.params.id)
      .populate("candidate")
      .populate("modules.trainer")
      .populate("evaluations.evaluatedBy");

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    res.status(200).json(training);
  } catch (error) {
    console.error("Error fetching training:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new training
export const createTraining = async (req, res) => {
  try {
    const { candidateId, startDate, endDate, modules, notes } = req.body;

    // Check if candidate exists
    const candidateExists = await Candidate.findById({ _id: candidateId });
    if (!candidateExists) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Check if training with trainingId already exists
    const existingTraining = await Training.findOne({ candidate: candidateId });
    if (existingTraining) {
      return res
        .status(400)
        .json({ message: "Training with this ID already exists" });
    }

    // Generate training ID if not provided
    const generatedTrainingId = `TRN-${Date.now().toString().slice(-6)}`;

    const newTraining = new Training({
      candidateId,
      startDate,
      endDate,
      trainingId: generatedTrainingId,
      modules: modules || [],
      notes,
      status: "PLANNED",
    });

    await newTraining.save();

    // Update candidate status to IN_TRAINING
    await Candidate.findByIdAndUpdate(candidateId, { status: "IN_TRAINING" });

    res.status(201).json({
      message: "Training created successfully",
      training: newTraining,
    });
  } catch (error) {
    console.error("Error creating training:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update training
export const updateTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating certain fields directly
    delete updateData.trainingId;
    delete updateData.candidate;

    const training = await Training.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    // If status is updated to COMPLETED, update candidate status to DEPLOYED
    if (updateData.status === "COMPLETED") {
      await Candidate.findByIdAndUpdate(training.candidate, {
        status: "DEPLOYED",
      });
    }

    res.status(200).json({
      message: "Training updated successfully",
      training,
    });
  } catch (error) {
    console.error("Error updating training:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete training
export const deleteTraining = async (req, res) => {
  try {
    const { id } = req.params;

    const training = await Training.findByIdAndDelete(id);

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    res.status(200).json({ message: "Training deleted successfully" });
  } catch (error) {
    console.error("Error deleting training:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Module management
export const addModule = async (req, res) => {
  try {
    const { id } = req.params;
    const moduleData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.modules.push(moduleData);
    await training.save();

    res.status(201).json({
      message: "Module added successfully",
      module: training.modules[training.modules.length - 1],
    });
  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const { id, moduleId } = req.params;
    const updateData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const moduleIndex = training.modules.findIndex(
      (module) => module._id.toString() === moduleId
    );

    if (moduleIndex === -1) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Update module fields
    Object.keys(updateData).forEach((key) => {
      training.modules[moduleIndex][key] = updateData[key];
    });

    await training.save();

    res.status(200).json({
      message: "Module updated successfully",
      module: training.modules[moduleIndex],
    });
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const { id, moduleId } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.modules = training.modules.filter(
      (module) => module._id.toString() !== moduleId
    );

    await training.save();

    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Evaluation management
export const addEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const evaluationData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    // Set evaluatedBy to current user if not provided
    if (!evaluationData.evaluatedBy) {
      evaluationData.evaluatedBy = req.user.id;
    }

    training.evaluations.push(evaluationData);
    await training.save();

    res.status(201).json({
      message: "Evaluation added successfully",
      evaluation: training.evaluations[training.evaluations.length - 1],
    });
  } catch (error) {
    console.error("Error adding evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateEvaluation = async (req, res) => {
  try {
    const { id, evaluationId } = req.params;
    const updateData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const evaluationIndex = training.evaluations.findIndex(
      (evaluation) => evaluation._id.toString() === evaluationId
    );

    if (evaluationIndex === -1) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Update evaluation fields
    Object.keys(updateData).forEach((key) => {
      training.evaluations[evaluationIndex][key] = updateData[key];
    });

    await training.save();

    res.status(200).json({
      message: "Evaluation updated successfully",
      evaluation: training.evaluations[evaluationIndex],
    });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteEvaluation = async (req, res) => {
  try {
    const { id, evaluationId } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.evaluations = training.evaluations.filter(
      (evaluation) => evaluation._id.toString() !== evaluationId
    );

    await training.save();

    res.status(200).json({ message: "Evaluation deleted successfully" });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Expense management
export const addExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expenseData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    // Set recordedBy to current user if not provided
    if (!expenseData.recordedBy) {
      expenseData.recordedBy = req.user.id;
    }

    training.expenses.push(expenseData);
    await training.save();

    res.status(201).json({
      message: "Expense added successfully",
      expense: training.expenses[training.expenses.length - 1],
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;
    const updateData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const expenseIndex = training.expenses.findIndex(
      (expense) => expense._id.toString() === expenseId
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Update expense fields
    Object.keys(updateData).forEach((key) => {
      training.expenses[expenseIndex][key] = updateData[key];
    });

    await training.save();

    res.status(200).json({
      message: "Expense updated successfully",
      expense: training.expenses[expenseIndex],
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.expenses = training.expenses.filter(
      (expense) => expense._id.toString() !== expenseId
    );

    await training.save();

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Skill Acquired management
export const addSkillAcquired = async (req, res) => {
  try {
    const { id } = req.params;
    const skillData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.skillsAcquired.push(skillData);
    await training.save();

    // Also add this skill to the candidate's skills with DURING_TRAINING
    const candidate = await Candidate.findById(training.candidate);
    if (candidate) {
      candidate.skills.push({
        name: skillData.name,
        type: "IT", // Assuming most training skills are IT-related
        proficiency: skillData.proficiency,
        acquiredDuring: "DURING_TRAINING",
      });
      await candidate.save();
    }

    res.status(201).json({
      message: "Skill added successfully",
      skill: training.skillsAcquired[training.skillsAcquired.length - 1],
    });
  } catch (error) {
    console.error("Error adding skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateSkillAcquired = async (req, res) => {
  try {
    const { id, skillId } = req.params;
    const updateData = req.body;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const skillIndex = training.skillsAcquired.findIndex(
      (skill) => skill._id.toString() === skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({ message: "Skill not found" });
    }

    // Update skill fields
    Object.keys(updateData).forEach((key) => {
      training.skillsAcquired[skillIndex][key] = updateData[key];
    });

    await training.save();

    res.status(200).json({
      message: "Skill updated successfully",
      skill: training.skillsAcquired[skillIndex],
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteSkillAcquired = async (req, res) => {
  try {
    const { id, skillId } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    training.skillsAcquired = training.skillsAcquired.filter(
      (skill) => skill._id.toString() !== skillId
    );

    await training.save();

    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error deleting skill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get training summary
export const getTrainingSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const summary = training.generateSummary();

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error generating training summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get trainings by candidate ID
export const getCandidateTrainings = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const trainings = await Training.find({ candidate: candidateId })
      .sort({ createdAt: -1 })
      .populate("modules.trainer")
      .populate("evaluations.evaluatedBy");

    res.status(200).json(trainings);
  } catch (error) {
    console.error("Error fetching candidate trainings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
