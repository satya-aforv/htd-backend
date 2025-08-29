import ReportTemplate from '../models/ReportTemplate.js';
import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';

class ReportService {
  // Generate report based on template
  async generateReport(templateId, parameters = {}, format = null) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const template = await ReportTemplate.findById(templateId);
      if (!template) {
        throw new Error('Report template not found');
      }

      // Record usage
      await template.recordUsage();

      // Get data based on template type
      const data = await this.fetchReportData(template, parameters);

      // Apply filters
      const filteredData = this.applyFilters(data, template.filters, parameters);

      // Apply sorting
      const sortedData = this.applySorting(filteredData, template.sortBy);

      // Apply grouping if specified
      const groupedData = template.groupBy.length > 0 
        ? this.applyGrouping(sortedData, template.groupBy)
        : sortedData;

      // Generate report in specified format
      const reportFormat = format || template.format;
      
      switch (reportFormat) {
        case 'PDF':
          return this.generatePDFReport(template, groupedData, parameters);
        case 'EXCEL':
          return this.generateExcelReport(template, groupedData, parameters);
        case 'CSV':
          return this.generateCSVReport(template, groupedData, parameters);
        case 'JSON':
          return this.generateJSONReport(template, groupedData, parameters);
        default:
          throw new Error(`Unsupported report format: ${reportFormat}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // Fetch data based on template type
  async fetchReportData(template, parameters) {
    const { startDate, endDate, candidateIds, trainingIds } = parameters;
    
    switch (template.type) {
      case 'CANDIDATE_REPORT':
        return this.fetchCandidateData(candidateIds, startDate, endDate);
      case 'TRAINING_REPORT':
        return this.fetchTrainingData(trainingIds, startDate, endDate);
      case 'PAYMENT_REPORT':
        return this.fetchPaymentData(candidateIds, startDate, endDate);
      case 'ANALYTICS_REPORT':
        return this.fetchAnalyticsData(startDate, endDate);
      default:
        throw new Error(`Unsupported template type: ${template.type}`);
    }
  }

  // Fetch candidate data
  async fetchCandidateData(candidateIds, startDate, endDate) {
    const query = { isActive: true };
    
    if (candidateIds && candidateIds.length > 0) {
      query._id = { $in: candidateIds };
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const candidates = await Candidate.find(query)
      .populate('user', 'name email')
      .lean();

    // Enrich with training and payment data
    for (const candidate of candidates) {
      if (!candidate?._id) {
        console.warn('Skipping candidate with missing ID');
        continue;
      }
      
      candidate.trainings = await Training.find({ candidate: candidate._id }).lean();
      candidate.payments = await Payment.find({ candidate: candidate._id, status: 'COMPLETED' }).lean();
      candidate.totalPayments = (candidate.payments || []).reduce((sum, p) => sum + (p?.amount || 0), 0);
      candidate.experienceData = this.calculateExperience(candidate);
    }

    return candidates;
  }

  // Fetch training data
  async fetchTrainingData(trainingIds, startDate, endDate) {
    const query = {};
    
    if (trainingIds && trainingIds.length > 0) {
      query._id = { $in: trainingIds };
    }
    
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const trainings = await Training.find(query)
      .populate('candidate', 'name candidateId email status')
      .populate('modules.trainer', 'name')
      .lean();

    // Enrich with calculated fields
    for (const training of trainings) {
      training.duration = this.calculateTrainingDuration(training);
      training.totalExpenses = training.expenses.reduce((sum, e) => sum + e.amount, 0);
      training.averageRating = this.calculateAverageRating(training);
      training.completionPercentage = this.calculateCompletionPercentage(training);
    }

    return trainings;
  }

  // Fetch payment data
  async fetchPaymentData(candidateIds, startDate, endDate) {
    const query = { status: 'COMPLETED' };
    
    if (candidateIds && candidateIds.length > 0) {
      query.candidate = { $in: candidateIds };
    }
    
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    return Payment.find(query)
      .populate('candidate', 'name candidateId email')
      .populate('processedBy', 'name')
      .lean();
  }

  // Apply filters to data
  applyFilters(data, filters, parameters) {
    if (!filters || filters.length === 0) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const value = this.getNestedValue(item, filter.field);
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'EQUALS':
            return value === filterValue;
          case 'NOT_EQUALS':
            return value !== filterValue;
          case 'CONTAINS':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'NOT_CONTAINS':
            return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'GREATER_THAN':
            return Number(value) > Number(filterValue);
          case 'LESS_THAN':
            return Number(value) < Number(filterValue);
          case 'BETWEEN':
            return Number(value) >= Number(filterValue[0]) && Number(value) <= Number(filterValue[1]);
          case 'IN':
            return Array.isArray(filterValue) && filterValue.includes(value);
          case 'NOT_IN':
            return Array.isArray(filterValue) && !filterValue.includes(value);
          default:
            return true;
        }
      });
    });
  }

  // Apply sorting to data
  applySorting(data, sortBy) {
    if (!sortBy || sortBy.length === 0) return data;

    return data.sort((a, b) => {
      for (const sort of sortBy) {
        const aValue = this.getNestedValue(a, sort.field);
        const bValue = this.getNestedValue(b, sort.field);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        if (comparison !== 0) {
          return sort.direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // Apply grouping to data
  applyGrouping(data, groupBy) {
    if (!groupBy || groupBy.length === 0) return data;

    const grouped = {};
    
    data.forEach(item => {
      const key = groupBy.map(field => this.getNestedValue(item, field)).join('|');
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }

  // Generate PDF report
  async generatePDFReport(template, data, parameters) {
    const doc = new PDFDocument({
      size: template.layout.pageSize,
      layout: template.layout.orientation.toLowerCase(),
      margins: template.layout.margins
    });

    // Add header
    this.addPDFHeader(doc, template, parameters);

    // Add data
    if (Array.isArray(data)) {
      this.addPDFTable(doc, template, data);
    } else {
      // Grouped data
      Object.keys(data).forEach(groupKey => {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold')
           .text(`Group: ${groupKey}`, 50, 50);
        this.addPDFTable(doc, template, data[groupKey]);
      });
    }

    // Add footer
    this.addPDFFooter(doc, template);

    return doc;
  }

  // Generate Excel report
  async generateExcelReport(template, data, parameters) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(template.name);

    // Add headers
    const headers = template.fields.filter(f => f.visible).map(f => f.label);
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: template.styling.primaryColor.replace('#', '') }
    };

    // Add data
    if (Array.isArray(data)) {
      data.forEach(item => {
        const row = template.fields
          .filter(f => f.visible)
          .map(field => this.formatFieldValue(this.getNestedValue(item, field.source), field));
        worksheet.addRow(row);
      });
    } else {
      // Grouped data
      Object.keys(data).forEach(groupKey => {
        worksheet.addRow([`Group: ${groupKey}`]);
        data[groupKey].forEach(item => {
          const row = template.fields
            .filter(f => f.visible)
            .map(field => this.formatFieldValue(this.getNestedValue(item, field.source), field));
          worksheet.addRow(row);
        });
        worksheet.addRow([]); // Empty row between groups
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return workbook;
  }

  // Generate CSV report
  generateCSVReport(template, data, parameters) {
    const headers = template.fields.filter(f => f.visible).map(f => f.label);
    let csv = headers.join(',') + '\n';

    if (Array.isArray(data)) {
      data.forEach(item => {
        const row = template.fields
          .filter(f => f.visible)
          .map(field => {
            const value = this.formatFieldValue(this.getNestedValue(item, field.source), field);
            return `"${String(value).replace(/"/g, '""')}"`;
          });
        csv += row.join(',') + '\n';
      });
    } else {
      // Grouped data
      Object.keys(data).forEach(groupKey => {
        csv += `"Group: ${groupKey}"\n`;
        data[groupKey].forEach(item => {
          const row = template.fields
            .filter(f => f.visible)
            .map(field => {
              const value = this.formatFieldValue(this.getNestedValue(item, field.source), field);
              return `"${String(value).replace(/"/g, '""')}"`;
            });
          csv += row.join(',') + '\n';
        });
        csv += '\n'; // Empty row between groups
      });
    }

    return csv;
  }

  // Generate JSON report
  generateJSONReport(template, data, parameters) {
    const processedData = Array.isArray(data) ? data : Object.keys(data).map(key => ({
      group: key,
      items: data[key]
    }));

    return {
      template: {
        name: template.name,
        type: template.type,
        generatedAt: new Date(),
        parameters
      },
      data: processedData,
      summary: {
        totalRecords: Array.isArray(data) ? data.length : Object.values(data).flat().length,
        fields: template.fields.filter(f => f.visible).map(f => ({
          name: f.name,
          label: f.label,
          type: f.type
        }))
      }
    };
  }

  // Helper methods
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  formatFieldValue(value, field) {
    if (value == null) return '';

    switch (field.format) {
      case 'currency':
        return `$${Number(value).toLocaleString()}`;
      case 'percentage':
        return `${Number(value)}%`;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value;
    }
  }

  calculateExperience(candidate) {
    if (!candidate?.experience || !Array.isArray(candidate.experience) || candidate.experience.length === 0) {
      return { itMonths: 0, nonItMonths: 0, totalMonths: 0 };
    }
    const itExp = candidate.experience?.filter(e => e.type === 'IT') || [];
    const nonItExp = candidate.experience?.filter(e => e.type === 'NON-IT') || [];
    
    const itMonths = itExp.reduce((sum, exp) => {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30));
    }, 0);

    const nonItMonths = nonItExp.reduce((sum, exp) => {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30));
    }, 0);

    return { itMonths, nonItMonths, totalMonths: itMonths + nonItMonths };
  }

  calculateTrainingDuration(training) {
    if (!training?.startDate) return 0;
    
    try {
      const start = new Date(training.startDate);
      const end = new Date(training.actualEndDate || training.expectedEndDate || new Date());
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }
      
      return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    } catch (error) {
      console.warn('Error calculating training duration:', error);
      return 0;
    }
  }

  calculateAverageRating(training) {
    if (!training?.evaluations || !Array.isArray(training.evaluations) || training.evaluations.length === 0) {
      return 0;
    }
    
    const validEvaluations = training.evaluations.filter(evaluation => evaluation?.rating && typeof evaluation.rating === 'number');
    if (validEvaluations.length === 0) return 0;
    
    const sum = validEvaluations.reduce((total, evaluation) => total + evaluation.rating, 0);
    return sum / validEvaluations.length;
  }

  calculateCompletionPercentage(training) {
    if (!training?.modules || !Array.isArray(training.modules) || training.modules.length === 0) {
      return 0;
    }
    
    const completed = training.modules.filter(m => m?.status === 'COMPLETED').length;
    return Math.round((completed / training.modules.length) * 100);
  }

  addPDFHeader(doc, template, parameters) {
    doc.fontSize(template.styling.headerFontSize)
       .font('Helvetica-Bold')
       .text(template.name, 50, 50);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleString()}`, 50, 75);
    
    if (template.description) {
      doc.text(template.description, 50, 90);
    }
    
    doc.moveTo(50, 110).lineTo(550, 110).stroke();
  }

  addPDFTable(doc, template, data) {
    const visibleFields = template.fields.filter(f => f.visible);
    const startY = 130;
    let currentY = startY;
    
    // Headers
    let currentX = 50;
    visibleFields.forEach(field => {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(field.label, currentX, currentY, { width: 100 });
      currentX += 110;
    });
    
    currentY += 20;
    doc.moveTo(50, currentY).lineTo(50 + (visibleFields.length * 110), currentY).stroke();
    currentY += 10;
    
    // Data rows
    data.forEach(item => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      currentX = 50;
      visibleFields.forEach(field => {
        const value = this.formatFieldValue(this.getNestedValue(item, field.source), field);
        doc.fontSize(9).font('Helvetica')
           .text(String(value), currentX, currentY, { width: 100 });
        currentX += 110;
      });
      currentY += 15;
    });
  }

  addPDFFooter(doc, template) {
    doc.fontSize(8).font('Helvetica')
       .text('Generated by HTD System', 50, 750, { align: 'center' });
  }
}

export default new ReportService();
