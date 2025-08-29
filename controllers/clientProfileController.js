import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import ShareableLink from '../models/ShareableLink.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Generate client-facing candidate profile
export const generateClientProfile = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Get training data
    const trainings = await Training.find({ candidate: candidateId })
      .populate('modules.trainer', 'name')
      .populate('evaluations.evaluatedBy', 'name');

    // Get payment summary
    const paymentSummary = await Payment.calculateTotalPaymentsForCandidate(candidateId);

    // Calculate experience
    const experienceData = candidate.calculateExperience();

    // Generate comprehensive client profile
    const clientProfile = {
      personalInfo: {
        name: candidate.name,
        email: candidate.email,
        contactNumber: candidate.contactNumber,
        candidateId: candidate.candidateId,
        status: candidate.status
      },
      education: candidate.education,
      experience: {
        details: candidate.experience,
        summary: {
          totalIT: `${Math.floor(experienceData.itExperienceMonths / 12)} years, ${experienceData.itExperienceMonths % 12} months`,
          totalNonIT: `${Math.floor(experienceData.nonItExperienceMonths / 12)} years, ${experienceData.nonItExperienceMonths % 12} months`,
          totalOverall: `${Math.floor(experienceData.totalExperienceMonths / 12)} years, ${experienceData.totalExperienceMonths % 12} months`
        }
      },
      skills: {
        beforeTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'BEFORE_TRAINING'),
        duringTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'DURING_TRAINING')
      },
      trainingHistory: trainings.map(training => ({
        trainingId: training.trainingId,
        duration: training.calculateDuration(),
        status: training.status,
        modules: training.modules.length,
        completedModules: training.modules.filter(m => m.status === 'COMPLETED').length,
        averageRating: training.calculateAverageRating(),
        skillsAcquired: training.skillsAcquired,
        totalExpenses: training.calculateTotalExpenses()
      })),
      financialInvestment: {
        totalInvested: paymentSummary.totalPaid,
        breakdown: {
          stipend: paymentSummary.stipend,
          salary: paymentSummary.salary,
          bonus: paymentSummary.bonus,
          reimbursement: paymentSummary.reimbursement,
          other: paymentSummary.other
        }
      },
      careerGaps: candidate.careerGaps,
      readinessScore: calculateReadinessScore(candidate, trainings),
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: clientProfile
    });

  } catch (error) {
    console.error('Error generating client profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate client profile' 
    });
  }
};

// Generate PDF export of client profile
export const exportClientProfilePDF = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const trainings = await Training.find({ candidate: candidateId });
    const paymentSummary = await Payment.calculateTotalPaymentsForCandidate(candidateId);
    const experienceData = candidate.calculateExperience();

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="candidate-profile-${candidate.candidateId}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    addPDFHeader(doc, candidate);
    addPersonalInfo(doc, candidate);
    addExperienceSummary(doc, candidate, experienceData);
    addEducationDetails(doc, candidate);
    addSkillsSection(doc, candidate);
    addTrainingHistory(doc, trainings);
    addFinancialSummary(doc, paymentSummary);
    addFooter(doc);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error exporting client profile PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export client profile PDF' 
    });
  }
};

// Calculate candidate readiness score
function calculateReadinessScore(candidate, trainings) {
  let score = 0;
  let maxScore = 100;

  // Education score (20 points)
  if (candidate.education.length > 0) {
    const avgPercentage = candidate.education.reduce((sum, edu) => sum + edu.percentage, 0) / candidate.education.length;
    score += Math.min(20, (avgPercentage / 100) * 20);
  }

  // Experience score (25 points)
  const experienceData = candidate.calculateExperience();
  const totalExpMonths = experienceData.totalExperienceMonths;
  score += Math.min(25, (totalExpMonths / 36) * 25); // 3 years = full score

  // Training score (30 points)
  if (trainings.length > 0) {
    const completedTrainings = trainings.filter(t => t.status === 'COMPLETED').length;
    const avgRating = trainings.reduce((sum, t) => sum + t.calculateAverageRating(), 0) / trainings.length;
    score += (completedTrainings / trainings.length) * 15; // Completion rate
    score += (avgRating / 5) * 15; // Average rating
  }

  // Skills score (25 points)
  const totalSkills = candidate.skills.length;
  const advancedSkills = candidate.skills.filter(s => s.proficiency === 'ADVANCED' || s.proficiency === 'EXPERT').length;
  score += Math.min(25, (totalSkills / 10) * 15 + (advancedSkills / totalSkills) * 10);

  return Math.round(score);
}

// PDF helper functions
function addPDFHeader(doc, candidate) {
  doc.fontSize(24).font('Helvetica-Bold')
     .text('Candidate Profile Report', 50, 50);
  
  doc.fontSize(16).font('Helvetica')
     .text(`${candidate.name} (${candidate.candidateId})`, 50, 80);
  
  doc.fontSize(12)
     .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 100);
  
  doc.moveTo(50, 120).lineTo(550, 120).stroke();
}

function addPersonalInfo(doc, candidate) {
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Personal Information', 50, 140);
  
  doc.fontSize(12).font('Helvetica')
     .text(`Email: ${candidate.email}`, 50, 165)
     .text(`Contact: ${candidate.contactNumber}`, 50, 180)
     .text(`Status: ${candidate.status}`, 50, 195)
     .text(`Address: ${candidate.address.street}, ${candidate.address.city}, ${candidate.address.state}`, 50, 210);
}

function addExperienceSummary(doc, candidate, experienceData) {
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Experience Summary', 50, 240);
  
  doc.fontSize(12).font('Helvetica')
     .text(`Total IT Experience: ${Math.floor(experienceData.itExperienceMonths / 12)} years, ${experienceData.itExperienceMonths % 12} months`, 50, 265)
     .text(`Total Non-IT Experience: ${Math.floor(experienceData.nonItExperienceMonths / 12)} years, ${experienceData.nonItExperienceMonths % 12} months`, 50, 280)
     .text(`Overall Experience: ${Math.floor(experienceData.totalExperienceMonths / 12)} years, ${experienceData.totalExperienceMonths % 12} months`, 50, 295);
}

function addEducationDetails(doc, candidate) {
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Education', 50, 325);
  
  let yPos = 350;
  candidate.education.forEach((edu, index) => {
    doc.fontSize(12).font('Helvetica')
       .text(`${index + 1}. ${edu.degree} - ${edu.institution} (${edu.yearOfPassing}) - ${edu.percentage}%`, 50, yPos);
    yPos += 20;
  });
}

function addSkillsSection(doc, candidate) {
  const startY = 450;
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Skills', 50, startY);
  
  let yPos = startY + 25;
  
  const beforeTraining = candidate.skills.filter(s => s.acquiredDuring === 'BEFORE_TRAINING');
  const duringTraining = candidate.skills.filter(s => s.acquiredDuring === 'DURING_TRAINING');
  
  if (beforeTraining.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Skills Before Training:', 50, yPos);
    yPos += 20;
    
    beforeTraining.forEach(skill => {
      doc.fontSize(12).font('Helvetica')
         .text(`• ${skill.name} (${skill.proficiency})`, 60, yPos);
      yPos += 15;
    });
  }
  
  if (duringTraining.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Skills Acquired During Training:', 50, yPos + 10);
    yPos += 35;
    
    duringTraining.forEach(skill => {
      doc.fontSize(12).font('Helvetica')
         .text(`• ${skill.name} (${skill.proficiency})`, 60, yPos);
      yPos += 15;
    });
  }
}

function addTrainingHistory(doc, trainings) {
  doc.addPage();
  
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Training History', 50, 50);
  
  let yPos = 80;
  trainings.forEach((training, index) => {
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`Training ${index + 1}: ${training.trainingId}`, 50, yPos);
    
    doc.fontSize(12).font('Helvetica')
       .text(`Status: ${training.status}`, 50, yPos + 20)
       .text(`Duration: ${training.calculateDuration()} days`, 50, yPos + 35)
       .text(`Modules: ${training.modules.length}`, 50, yPos + 50)
       .text(`Average Rating: ${training.calculateAverageRating().toFixed(1)}/5`, 50, yPos + 65);
    
    yPos += 100;
    
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
  });
}

function addFinancialSummary(doc, paymentSummary) {
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Financial Investment Summary', 50, 400);
  
  doc.fontSize(12).font('Helvetica')
     .text(`Total Investment: $${paymentSummary.totalPaid.toLocaleString()}`, 50, 430)
     .text(`Stipend: $${paymentSummary.stipend.toLocaleString()}`, 50, 445)
     .text(`Salary: $${paymentSummary.salary.toLocaleString()}`, 50, 460)
     .text(`Bonus: $${paymentSummary.bonus.toLocaleString()}`, 50, 475)
     .text(`Reimbursements: $${paymentSummary.reimbursement.toLocaleString()}`, 50, 490);
}

function addFooter(doc) {
  doc.fontSize(10).font('Helvetica')
     .text('This document is confidential and intended for client review only.', 50, 750, { align: 'center' });
}

// Create shareable link for client profile
export const createShareableLink = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { 
      title, 
      description, 
      expiresInDays = 30, 
      maxAccess = null, 
      allowedDomains = [] 
    } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const shareableLink = new ShareableLink({
      candidate: candidateId,
      title: title || `Profile for ${candidate.name}`,
      description,
      expiresAt,
      maxAccess,
      allowedDomains,
      createdBy: req.user.id,
    });

    await shareableLink.save();

    res.status(201).json({
      success: true,
      data: {
        linkId: shareableLink.linkId,
        url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/public/profile/${shareableLink.linkId}`,
        title: shareableLink.title,
        expiresAt: shareableLink.expiresAt,
        maxAccess: shareableLink.maxAccess,
      }
    });

  } catch (error) {
    console.error('Error creating shareable link:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create shareable link' 
    });
  }
};

// Get public candidate profile via shareable link
export const getPublicProfile = async (req, res) => {
  try {
    const { linkId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const shareableLink = await ShareableLink.findOne({ linkId, isActive: true })
      .populate('candidate');

    if (!shareableLink) {
      return res.status(404).json({ message: 'Link not found or expired' });
    }

    if (!shareableLink.isAccessible()) {
      return res.status(403).json({ 
        message: 'Link has expired or reached maximum access limit' 
      });
    }

    // Log access
    await shareableLink.logAccess(ipAddress, userAgent);

    const candidate = shareableLink.candidate;
    
    // Get training data
    const trainings = await Training.find({ candidate: candidate._id })
      .select('-expenses -evaluations.comments') // Hide sensitive data
      .populate('modules.trainer', 'name');

    // Get limited payment summary (no detailed breakdown)
    const paymentSummary = await Payment.calculateTotalPaymentsForCandidate(candidate._id);
    const experienceData = candidate.calculateExperience();

    // Generate public-safe profile
    const publicProfile = {
      linkInfo: {
        title: shareableLink.title,
        description: shareableLink.description,
        accessCount: shareableLink.accessCount,
      },
      personalInfo: {
        name: candidate.name,
        candidateId: candidate.candidateId,
        status: candidate.status
      },
      education: candidate.education.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        yearOfPassing: edu.yearOfPassing,
        percentage: edu.percentage
      })),
      experience: {
        summary: {
          totalIT: `${Math.floor(experienceData.itExperienceMonths / 12)} years, ${experienceData.itExperienceMonths % 12} months`,
          totalNonIT: `${Math.floor(experienceData.nonItExperienceMonths / 12)} years, ${experienceData.nonItExperienceMonths % 12} months`,
          totalOverall: `${Math.floor(experienceData.totalExperienceMonths / 12)} years, ${experienceData.totalExperienceMonths % 12} months`
        },
        details: candidate.experience.map(exp => ({
          type: exp.type,
          companyName: exp.companyName,
          role: exp.role,
          duration: `${new Date(exp.startDate).getFullYear()} - ${new Date(exp.endDate).getFullYear()}`
        }))
      },
      skills: {
        beforeTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'BEFORE_TRAINING'),
        duringTraining: candidate.skills.filter(skill => skill.acquiredDuring === 'DURING_TRAINING')
      },
      trainingHistory: trainings.map(training => ({
        trainingId: training.trainingId,
        duration: training.calculateDuration(),
        status: training.status,
        modules: training.modules.length,
        completedModules: training.modules.filter(m => m.status === 'COMPLETED').length,
        averageRating: training.calculateAverageRating(),
        skillsAcquired: training.skillsAcquired
      })),
      investmentSummary: {
        totalInvested: paymentSummary.totalPaid,
        trainingCompleted: trainings.filter(t => t.status === 'COMPLETED').length
      },
      readinessScore: calculateReadinessScore(candidate, trainings),
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: publicProfile
    });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
};

// Get all shareable links for a candidate
export const getShareableLinks = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const links = await ShareableLink.find({ candidate: candidateId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ShareableLink.countDocuments({ candidate: candidateId });

    const linksWithUrls = links.map(link => ({
      ...link.toObject(),
      url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/public/profile/${link.linkId}`,
      isAccessible: link.isAccessible()
    }));

    res.json({
      success: true,
      data: {
        links: linksWithUrls,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        totalLinks: total
      }
    });

  } catch (error) {
    console.error('Error fetching shareable links:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shareable links' 
    });
  }
};

// Update shareable link
export const updateShareableLink = async (req, res) => {
  try {
    const { linkId } = req.params;
    const updates = req.body;

    const shareableLink = await ShareableLink.findOne({ linkId });
    if (!shareableLink) {
      return res.status(404).json({ message: 'Shareable link not found' });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['title', 'description', 'expiresAt', 'maxAccess', 'isActive', 'allowedDomains'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    Object.assign(shareableLink, updateData);
    await shareableLink.save();

    res.json({
      success: true,
      data: {
        ...shareableLink.toObject(),
        url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/public/profile/${shareableLink.linkId}`,
        isAccessible: shareableLink.isAccessible()
      }
    });

  } catch (error) {
    console.error('Error updating shareable link:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update shareable link' 
    });
  }
};

// Delete shareable link
export const deleteShareableLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    const shareableLink = await ShareableLink.findOneAndDelete({ linkId });
    if (!shareableLink) {
      return res.status(404).json({ message: 'Shareable link not found' });
    }

    res.json({
      success: true,
      message: 'Shareable link deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting shareable link:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete shareable link' 
    });
  }
};
