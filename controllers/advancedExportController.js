import ReportTemplate from '../models/ReportTemplate.js';
import reportService from '../services/reportService.js';
import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

// Get all report templates
export const getReportTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, search } = req.query;
    const userId = req.user.id;
    
    const query = {
      $or: [
        { createdBy: userId },
        { isPublic: true },
        { isSystem: true }
      ]
    };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }
    
    const templates = await ReportTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ usageCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await ReportTemplate.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        templates,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        totalTemplates: total
      }
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report templates'
    });
  }
};

// Create new report template
export const createReportTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const template = new ReportTemplate(templateData);
    
    // Validate template
    const validationErrors = template.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Template validation failed',
        errors: validationErrors
      });
    }
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'Report template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating report template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report template'
    });
  }
};

// Update report template
export const updateReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    
    const template = await ReportTemplate.findOne({
      _id: templateId,
      $or: [
        { createdBy: userId },
        { isPublic: true, createdBy: userId } // Only creator can edit public templates
      ]
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Report template not found or access denied'
      });
    }
    
    // Don't allow editing system templates
    if (template.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'System templates cannot be modified'
      });
    }
    
    Object.assign(template, req.body);
    
    // Validate updated template
    const validationErrors = template.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Template validation failed',
        errors: validationErrors
      });
    }
    
    await template.save();
    
    res.json({
      success: true,
      message: 'Report template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating report template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report template'
    });
  }
};

// Delete report template
export const deleteReportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    
    const template = await ReportTemplate.findOne({
      _id: templateId,
      createdBy: userId,
      isSystem: false // Prevent deletion of system templates
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Report template not found or access denied'
      });
    }
    
    await ReportTemplate.findByIdAndDelete(templateId);
    
    res.json({
      success: true,
      message: 'Report template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report template'
    });
  }
};

// Generate report using template
export const generateReport = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { format, parameters = {} } = req.body;
    
    const template = await ReportTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Report template not found'
      });
    }
    
    // Check access permissions
    const userId = req.user.id;
    if (!template.isPublic && !template.isSystem && template.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this report template'
      });
    }
    
    const reportData = await reportService.generateReport(templateId, parameters, format);
    
    // Set appropriate response headers based on format
    const reportFormat = format || template.format;
    switch (reportFormat) {
      case 'PDF':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.name}.pdf"`);
        reportData.pipe(res);
        reportData.end();
        break;
      case 'EXCEL':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${template.name}.xlsx"`);
        await reportData.xlsx.write(res);
        res.end();
        break;
      case 'CSV':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${template.name}.csv"`);
        res.send(reportData);
        break;
      case 'JSON':
        res.json({
          success: true,
          data: reportData
        });
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Unsupported report format'
        });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

// Bulk export candidates
export const bulkExportCandidates = async (req, res) => {
  try {
    const { candidateIds, format = 'EXCEL', includeTraining = true, includePayments = true } = req.body;
    
    if (!candidateIds || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Candidate IDs are required'
      });
    }
    
    // Verify candidates exist
    const candidates = await Candidate.find({ _id: { $in: candidateIds } });
    if (candidates.length !== candidateIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some candidates not found'
      });
    }
    
    // Create dynamic template for bulk export
    const bulkTemplate = {
      name: 'Bulk Candidate Export',
      type: 'CANDIDATE_REPORT',
      format: format,
      fields: [
        { name: 'candidateId', label: 'Candidate ID', type: 'TEXT', source: 'candidateId', visible: true, order: 1 },
        { name: 'name', label: 'Name', type: 'TEXT', source: 'name', visible: true, order: 2 },
        { name: 'email', label: 'Email', type: 'TEXT', source: 'email', visible: true, order: 3 },
        { name: 'status', label: 'Status', type: 'TEXT', source: 'status', visible: true, order: 4 },
        { name: 'contactNumber', label: 'Contact', type: 'TEXT', source: 'contactNumber', visible: true, order: 5 },
        { name: 'totalExperience', label: 'Total Experience (Months)', type: 'NUMBER', source: 'experienceData.totalMonths', visible: true, order: 6 },
        { name: 'skillsCount', label: 'Skills Count', type: 'NUMBER', source: 'skills.length', visible: true, order: 7 }
      ],
      filters: [],
      sortBy: [{ field: 'name', direction: 'ASC' }],
      layout: { orientation: 'LANDSCAPE', pageSize: 'A4' },
      styling: { primaryColor: '#3B82F6' }
    };
    
    if (includeTraining) {
      bulkTemplate.fields.push(
        { name: 'trainingsCount', label: 'Trainings Count', type: 'NUMBER', source: 'trainings.length', visible: true, order: 8 },
        { name: 'completedTrainings', label: 'Completed Trainings', type: 'NUMBER', source: 'trainings', visible: true, order: 9, aggregation: 'COUNT' }
      );
    }
    
    if (includePayments) {
      bulkTemplate.fields.push(
        { name: 'totalPayments', label: 'Total Payments', type: 'NUMBER', source: 'totalPayments', visible: true, order: 10, format: 'currency' }
      );
    }
    
    const reportData = await reportService.generateReport(null, { candidateIds }, format, bulkTemplate);
    
    // Set response headers
    switch (format) {
      case 'PDF':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="bulk-candidates-export.pdf"');
        reportData.pipe(res);
        reportData.end();
        break;
      case 'EXCEL':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="bulk-candidates-export.xlsx"');
        await reportData.xlsx.write(res);
        res.end();
        break;
      case 'CSV':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="bulk-candidates-export.csv"');
        res.send(reportData);
        break;
      default:
        res.json({
          success: true,
          data: reportData
        });
    }
  } catch (error) {
    console.error('Error in bulk export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export candidates'
    });
  }
};

// Get available report fields for a given type
export const getReportFields = async (req, res) => {
  try {
    const { type } = req.params;
    
    const fieldMappings = {
      CANDIDATE_REPORT: [
        { name: 'candidateId', label: 'Candidate ID', type: 'TEXT', source: 'candidateId' },
        { name: 'name', label: 'Name', type: 'TEXT', source: 'name' },
        { name: 'email', label: 'Email', type: 'TEXT', source: 'email' },
        { name: 'status', label: 'Status', type: 'TEXT', source: 'status' },
        { name: 'contactNumber', label: 'Contact Number', type: 'TEXT', source: 'contactNumber' },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'DATE', source: 'dateOfBirth' },
        { name: 'gender', label: 'Gender', type: 'TEXT', source: 'gender' },
        { name: 'address', label: 'Address', type: 'TEXT', source: 'address.street' },
        { name: 'city', label: 'City', type: 'TEXT', source: 'address.city' },
        { name: 'state', label: 'State', type: 'TEXT', source: 'address.state' },
        { name: 'skillsCount', label: 'Skills Count', type: 'NUMBER', source: 'skills.length' },
        { name: 'experienceMonths', label: 'Total Experience (Months)', type: 'NUMBER', source: 'experienceData.totalMonths' },
        { name: 'createdAt', label: 'Registration Date', type: 'DATE', source: 'createdAt' }
      ],
      TRAINING_REPORT: [
        { name: 'trainingId', label: 'Training ID', type: 'TEXT', source: 'trainingId' },
        { name: 'candidateName', label: 'Candidate Name', type: 'TEXT', source: 'candidate.name' },
        { name: 'status', label: 'Status', type: 'TEXT', source: 'status' },
        { name: 'startDate', label: 'Start Date', type: 'DATE', source: 'startDate' },
        { name: 'expectedEndDate', label: 'Expected End Date', type: 'DATE', source: 'expectedEndDate' },
        { name: 'actualEndDate', label: 'Actual End Date', type: 'DATE', source: 'actualEndDate' },
        { name: 'duration', label: 'Duration (Days)', type: 'NUMBER', source: 'duration' },
        { name: 'modulesCount', label: 'Modules Count', type: 'NUMBER', source: 'modules.length' },
        { name: 'completedModules', label: 'Completed Modules', type: 'NUMBER', source: 'completedModules' },
        { name: 'averageRating', label: 'Average Rating', type: 'NUMBER', source: 'averageRating' },
        { name: 'totalExpenses', label: 'Total Expenses', type: 'NUMBER', source: 'totalExpenses', format: 'currency' },
        { name: 'skillsAcquired', label: 'Skills Acquired', type: 'NUMBER', source: 'skillsAcquired.length' }
      ],
      PAYMENT_REPORT: [
        { name: 'paymentId', label: 'Payment ID', type: 'TEXT', source: 'paymentId' },
        { name: 'candidateName', label: 'Candidate Name', type: 'TEXT', source: 'candidate.name' },
        { name: 'amount', label: 'Amount', type: 'NUMBER', source: 'amount', format: 'currency' },
        { name: 'type', label: 'Payment Type', type: 'TEXT', source: 'type' },
        { name: 'paymentDate', label: 'Payment Date', type: 'DATE', source: 'paymentDate' },
        { name: 'paymentMode', label: 'Payment Mode', type: 'TEXT', source: 'paymentMode' },
        { name: 'status', label: 'Status', type: 'TEXT', source: 'status' },
        { name: 'month', label: 'Month', type: 'NUMBER', source: 'month' },
        { name: 'year', label: 'Year', type: 'NUMBER', source: 'year' },
        { name: 'processedBy', label: 'Processed By', type: 'TEXT', source: 'processedBy.name' }
      ]
    };
    
    const fields = fieldMappings[type] || [];
    
    res.json({
      success: true,
      data: { fields }
    });
  } catch (error) {
    console.error('Error fetching report fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report fields'
    });
  }
};

// Create system default templates
export const createSystemTemplates = async (req, res) => {
  try {
    const systemTemplates = [
      {
        name: 'Candidate Summary Report',
        description: 'Basic candidate information with training and payment summary',
        type: 'CANDIDATE_REPORT',
        category: 'OPERATIONAL',
        isSystem: true,
        isPublic: true,
        createdBy: req.user.id,
        fields: [
          { name: 'candidateId', label: 'Candidate ID', type: 'TEXT', source: 'candidateId', visible: true, order: 1 },
          { name: 'name', label: 'Name', type: 'TEXT', source: 'name', visible: true, order: 2 },
          { name: 'email', label: 'Email', type: 'TEXT', source: 'email', visible: true, order: 3 },
          { name: 'status', label: 'Status', type: 'TEXT', source: 'status', visible: true, order: 4 },
          { name: 'skillsCount', label: 'Skills Count', type: 'NUMBER', source: 'skills.length', visible: true, order: 5 },
          { name: 'totalPayments', label: 'Total Payments', type: 'NUMBER', source: 'totalPayments', visible: true, order: 6, format: 'currency' }
        ],
        sortBy: [{ field: 'name', direction: 'ASC' }]
      },
      {
        name: 'Training Performance Report',
        description: 'Detailed training performance with ratings and completion status',
        type: 'TRAINING_REPORT',
        category: 'PERFORMANCE',
        isSystem: true,
        isPublic: true,
        createdBy: req.user.id,
        fields: [
          { name: 'trainingId', label: 'Training ID', type: 'TEXT', source: 'trainingId', visible: true, order: 1 },
          { name: 'candidateName', label: 'Candidate', type: 'TEXT', source: 'candidate.name', visible: true, order: 2 },
          { name: 'status', label: 'Status', type: 'TEXT', source: 'status', visible: true, order: 3 },
          { name: 'duration', label: 'Duration (Days)', type: 'NUMBER', source: 'duration', visible: true, order: 4 },
          { name: 'averageRating', label: 'Average Rating', type: 'NUMBER', source: 'averageRating', visible: true, order: 5 },
          { name: 'completionPercentage', label: 'Completion %', type: 'NUMBER', source: 'completionPercentage', visible: true, order: 6, format: 'percentage' }
        ],
        sortBy: [{ field: 'averageRating', direction: 'DESC' }]
      },
      {
        name: 'Financial Summary Report',
        description: 'Payment summary by candidate and type',
        type: 'PAYMENT_REPORT',
        category: 'FINANCIAL',
        isSystem: true,
        isPublic: true,
        createdBy: req.user.id,
        fields: [
          { name: 'candidateName', label: 'Candidate', type: 'TEXT', source: 'candidate.name', visible: true, order: 1 },
          { name: 'type', label: 'Payment Type', type: 'TEXT', source: 'type', visible: true, order: 2 },
          { name: 'amount', label: 'Amount', type: 'NUMBER', source: 'amount', visible: true, order: 3, format: 'currency', aggregation: 'SUM' },
          { name: 'paymentDate', label: 'Payment Date', type: 'DATE', source: 'paymentDate', visible: true, order: 4 },
          { name: 'status', label: 'Status', type: 'TEXT', source: 'status', visible: true, order: 5 }
        ],
        groupBy: ['candidate.name'],
        sortBy: [{ field: 'paymentDate', direction: 'DESC' }]
      }
    ];

    // Check if system templates already exist
    const existingTemplates = await ReportTemplate.find({ isSystem: true });
    if (existingTemplates.length > 0) {
      return res.json({
        success: true,
        message: 'System templates already exist',
        data: { count: existingTemplates.length }
      });
    }

    const createdTemplates = await ReportTemplate.insertMany(systemTemplates);

    res.status(201).json({
      success: true,
      message: 'System templates created successfully',
      data: { count: createdTemplates.length }
    });
  } catch (error) {
    console.error('Error creating system templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create system templates'
    });
  }
};
