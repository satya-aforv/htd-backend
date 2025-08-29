import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Get candidate's own profile and dashboard data
export const getCandidateDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find candidate by user ID
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Get training data
    const trainings = await Training.find({ candidate: candidate._id })
      .populate('modules.trainer', 'name')
      .populate('evaluations.evaluatedBy', 'name');

    // Get payment summary
    const paymentSummary = await Payment.calculateTotalPaymentsForCandidate(candidate._id);
    
    // Get recent payments
    const recentPayments = await Payment.find({ 
      candidate: candidate._id,
      status: 'COMPLETED'
    })
      .sort({ paymentDate: -1 })
      .limit(5);

    // Get notifications count
    const notificationStats = await Notification.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadNotifications = notificationStats.find(stat => 
      stat._id === 'PENDING' || stat._id === 'SENT'
    )?.count || 0;

    // Calculate experience
    const experienceData = candidate.calculateExperience();

    // Calculate progress metrics
    const progressMetrics = calculateProgressMetrics(candidate, trainings);

    const dashboardData = {
      personalInfo: {
        name: candidate.name,
        email: candidate.email,
        candidateId: candidate.candidateId,
        status: candidate.status,
        contactNumber: candidate.contactNumber,
        dateOfBirth: candidate.dateOfBirth,
        address: candidate.address
      },
      progressMetrics,
      experience: {
        summary: {
          totalIT: `${Math.floor(experienceData.itExperienceMonths / 12)} years, ${experienceData.itExperienceMonths % 12} months`,
          totalNonIT: `${Math.floor(experienceData.nonItExperienceMonths / 12)} years, ${experienceData.nonItExperienceMonths % 12} months`,
          totalOverall: `${Math.floor(experienceData.totalExperienceMonths / 12)} years, ${experienceData.totalExperienceMonths % 12} months`
        },
        details: candidate.experience
      },
      currentTraining: trainings.find(t => t.status === 'IN_PROGRESS') || null,
      completedTrainings: trainings.filter(t => t.status === 'COMPLETED').length,
      totalTrainings: trainings.length,
      skills: {
        beforeTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'BEFORE_TRAINING'),
        duringTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'DURING_TRAINING'),
        total: candidate.skills.length
      },
      payments: {
        summary: paymentSummary,
        recent: recentPayments,
        totalReceived: paymentSummary.totalPaid
      },
      notifications: {
        unread: unreadNotifications,
        total: notificationStats.reduce((sum, stat) => sum + stat.count, 0)
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching candidate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// Get candidate's training progress
export const getTrainingProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const trainings = await Training.find({ candidate: candidate._id })
      .populate('modules.trainer', 'name')
      .populate('evaluations.evaluatedBy', 'name')
      .sort({ startDate: -1 });

    const trainingProgress = trainings.map(training => ({
      trainingId: training.trainingId,
      startDate: training.startDate,
      expectedEndDate: training.expectedEndDate,
      actualEndDate: training.actualEndDate,
      status: training.status,
      duration: training.calculateDuration(),
      modules: training.modules.map(module => ({
        name: module.name,
        technology: module.technology,
        duration: module.duration,
        status: module.status,
        trainer: module.trainer?.name || 'Not assigned'
      })),
      evaluations: training.evaluations.map(eval => ({
        month: eval.month,
        year: eval.year,
        rating: eval.rating,
        comments: eval.comments,
        evaluatedBy: eval.evaluatedBy?.name || 'Unknown',
        evaluatedAt: eval.evaluatedAt
      })),
      skillsAcquired: training.skillsAcquired,
      averageRating: training.calculateAverageRating(),
      completionPercentage: calculateTrainingCompletion(training)
    }));

    res.json({
      success: true,
      data: {
        trainings: trainingProgress,
        summary: {
          total: trainings.length,
          completed: trainings.filter(t => t.status === 'COMPLETED').length,
          inProgress: trainings.filter(t => t.status === 'IN_PROGRESS').length,
          planned: trainings.filter(t => t.status === 'PLANNED').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training progress'
    });
  }
};

// Get candidate's payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, year, type } = req.query;
    
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const query = { 
      candidate: candidate._id,
      status: 'COMPLETED'
    };

    if (year) query.year = parseInt(year);
    if (type) query.type = type;

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);
    const paymentSummary = await Payment.calculateTotalPaymentsForCandidate(candidate._id);

    // Get monthly breakdown for current year
    const currentYear = new Date().getFullYear();
    const monthlyBreakdown = await Payment.getMonthlyPaymentSummary(candidate._id, currentYear);

    res.json({
      success: true,
      data: {
        payments,
        summary: paymentSummary,
        monthlyBreakdown,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
};

// Get candidate's skill development timeline
export const getSkillDevelopment = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const trainings = await Training.find({ candidate: candidate._id });

    // Organize skills by acquisition timeline
    const skillTimeline = [];
    
    // Add pre-training skills
    candidate.skills
      .filter(skill => skill.acquiredDuring === 'BEFORE_TRAINING')
      .forEach(skill => {
        skillTimeline.push({
          name: skill.name,
          type: skill.type,
          proficiency: skill.proficiency,
          acquiredDuring: 'BEFORE_TRAINING',
          acquiredDate: null,
          source: 'Previous Experience'
        });
      });

    // Add training-acquired skills
    trainings.forEach(training => {
      training.skillsAcquired.forEach(skill => {
        skillTimeline.push({
          name: skill.name,
          proficiency: skill.proficiency,
          acquiredDuring: 'DURING_TRAINING',
          acquiredDate: skill.acquiredDate,
          source: `Training: ${training.trainingId}`,
          trainingId: training.trainingId
        });
      });
    });

    // Sort by acquisition date
    skillTimeline.sort((a, b) => {
      if (!a.acquiredDate) return -1;
      if (!b.acquiredDate) return 1;
      return new Date(a.acquiredDate) - new Date(b.acquiredDate);
    });

    // Skill statistics
    const skillStats = {
      total: candidate.skills.length,
      beforeTraining: candidate.skills.filter(s => s.acquiredDuring === 'BEFORE_TRAINING').length,
      duringTraining: candidate.skills.filter(s => s.acquiredDuring === 'DURING_TRAINING').length,
      byType: {
        IT: candidate.skills.filter(s => s.type === 'IT').length,
        'NON-IT': candidate.skills.filter(s => s.type === 'NON-IT').length
      },
      byProficiency: {
        BEGINNER: candidate.skills.filter(s => s.proficiency === 'BEGINNER').length,
        INTERMEDIATE: candidate.skills.filter(s => s.proficiency === 'INTERMEDIATE').length,
        ADVANCED: candidate.skills.filter(s => s.proficiency === 'ADVANCED').length,
        EXPERT: candidate.skills.filter(s => s.proficiency === 'EXPERT').length
      }
    };

    res.json({
      success: true,
      data: {
        timeline: skillTimeline,
        statistics: skillStats,
        currentSkills: candidate.skills
      }
    });

  } catch (error) {
    console.error('Error fetching skill development:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill development data'
    });
  }
};

// Update candidate's personal information (limited fields)
export const updatePersonalInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactNumber, alternateContactNumber, address } = req.body;
    
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = {};
    if (contactNumber) allowedUpdates.contactNumber = contactNumber;
    if (alternateContactNumber) allowedUpdates.alternateContactNumber = alternateContactNumber;
    if (address) allowedUpdates.address = { ...candidate.address, ...address };

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidate._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Personal information updated successfully',
      data: {
        contactNumber: updatedCandidate.contactNumber,
        alternateContactNumber: updatedCandidate.alternateContactNumber,
        address: updatedCandidate.address
      }
    });

  } catch (error) {
    console.error('Error updating personal info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal information'
    });
  }
};

// Get candidate's documents
export const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const candidate = await Candidate.findOne({ user: userId });
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const documents = candidate.documents.map(doc => ({
      type: doc.type,
      uploadedAt: doc.uploadedAt,
      description: doc.description,
      // Don't expose the actual URL for security
      hasDocument: !!doc.url
    }));

    res.json({
      success: true,
      data: {
        documents,
        summary: {
          total: documents.length,
          byType: {
            RESUME: documents.filter(d => d.type === 'RESUME').length,
            OFFER_LETTER: documents.filter(d => d.type === 'OFFER_LETTER').length,
            RELIEVING_LETTER: documents.filter(d => d.type === 'RELIEVING_LETTER').length,
            BANK_STATEMENT: documents.filter(d => d.type === 'BANK_STATEMENT').length,
            ID_PROOF: documents.filter(d => d.type === 'ID_PROOF').length,
            OTHER: documents.filter(d => d.type === 'OTHER').length
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

// Helper functions
function calculateProgressMetrics(candidate, trainings) {
  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter(t => t.status === 'COMPLETED').length;
  const inProgressTrainings = trainings.filter(t => t.status === 'IN_PROGRESS').length;
  
  const totalSkills = candidate.skills.length;
  const trainingSkills = candidate.skills.filter(s => s.acquiredDuring === 'DURING_TRAINING').length;
  
  const averageRating = trainings.length > 0 
    ? trainings.reduce((sum, t) => sum + t.calculateAverageRating(), 0) / trainings.length 
    : 0;

  return {
    trainingCompletion: totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0,
    skillsAcquired: trainingSkills,
    averagePerformance: Math.round(averageRating * 20), // Convert 5-point scale to percentage
    activeTrainings: inProgressTrainings,
    overallProgress: calculateOverallProgress(candidate, trainings)
  };
}

function calculateTrainingCompletion(training) {
  const totalModules = training.modules.length;
  const completedModules = training.modules.filter(m => m.status === 'COMPLETED').length;
  return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
}

function calculateOverallProgress(candidate, trainings) {
  let score = 0;
  
  // Training completion (40%)
  const completedTrainings = trainings.filter(t => t.status === 'COMPLETED').length;
  const trainingScore = trainings.length > 0 ? (completedTrainings / trainings.length) * 40 : 0;
  
  // Skills acquired (30%)
  const trainingSkills = candidate.skills.filter(s => s.acquiredDuring === 'DURING_TRAINING').length;
  const skillScore = Math.min(trainingSkills / 10, 1) * 30; // Assume 10 skills is excellent
  
  // Performance rating (30%)
  const avgRating = trainings.length > 0 
    ? trainings.reduce((sum, t) => sum + t.calculateAverageRating(), 0) / trainings.length 
    : 0;
  const performanceScore = (avgRating / 5) * 30;
  
  score = trainingScore + skillScore + performanceScore;
  return Math.round(score);
}
