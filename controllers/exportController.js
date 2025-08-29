import ExcelJS from 'exceljs';
import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';

// Export candidates to Excel
export const exportCandidatesExcel = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const candidates = await Candidate.find(filter).lean();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');

    // Add headers
    worksheet.columns = [
      { header: 'Candidate ID', key: 'candidateId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Contact', key: 'contactNumber', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 20 },
      { header: 'Total Experience (Months)', key: 'totalExperience', width: 20 },
      { header: 'IT Experience (Months)', key: 'itExperience', width: 20 },
      { header: 'Education Count', key: 'educationCount', width: 15 },
      { header: 'Skills Count', key: 'skillsCount', width: 15 },
      { header: 'Created Date', key: 'createdAt', width: 20 }
    ];

    // Add data
    candidates.forEach(candidate => {
      const experienceData = calculateCandidateExperience(candidate);
      
      worksheet.addRow({
        candidateId: candidate.candidateId,
        name: candidate.name,
        email: candidate.email,
        contactNumber: candidate.contactNumber,
        status: candidate.status,
        gender: candidate.gender,
        dateOfBirth: new Date(candidate.dateOfBirth).toLocaleDateString(),
        city: candidate.address?.city || '',
        state: candidate.address?.state || '',
        totalExperience: experienceData.totalExperienceMonths,
        itExperience: experienceData.itExperienceMonths,
        educationCount: candidate.education?.length || 0,
        skillsCount: candidate.skills?.length || 0,
        createdAt: new Date(candidate.createdAt).toLocaleDateString()
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates-export.xlsx"');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting candidates to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export candidates to Excel'
    });
  }
};

// Export trainings to Excel
export const exportTrainingsExcel = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const trainings = await Training.find(filter)
      .populate('candidate', 'name candidateId email')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trainings');

    worksheet.columns = [
      { header: 'Training ID', key: 'trainingId', width: 15 },
      { header: 'Candidate Name', key: 'candidateName', width: 25 },
      { header: 'Candidate ID', key: 'candidateId', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Expected End Date', key: 'expectedEndDate', width: 18 },
      { header: 'Actual End Date', key: 'actualEndDate', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Duration (Days)', key: 'duration', width: 15 },
      { header: 'Modules Count', key: 'modulesCount', width: 15 },
      { header: 'Completed Modules', key: 'completedModules', width: 18 },
      { header: 'Average Rating', key: 'averageRating', width: 15 },
      { header: 'Total Expenses', key: 'totalExpenses', width: 15 },
      { header: 'Skills Acquired', key: 'skillsAcquired', width: 15 }
    ];

    trainings.forEach(training => {
      const duration = calculateTrainingDuration(training);
      const avgRating = calculateAverageRating(training);
      const totalExpenses = training.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const completedModules = training.modules?.filter(m => m.status === 'COMPLETED').length || 0;

      worksheet.addRow({
        trainingId: training.trainingId,
        candidateName: training.candidate?.name || '',
        candidateId: training.candidate?.candidateId || '',
        startDate: new Date(training.startDate).toLocaleDateString(),
        expectedEndDate: new Date(training.expectedEndDate).toLocaleDateString(),
        actualEndDate: training.actualEndDate ? new Date(training.actualEndDate).toLocaleDateString() : '',
        status: training.status,
        duration,
        modulesCount: training.modules?.length || 0,
        completedModules,
        averageRating: avgRating.toFixed(1),
        totalExpenses: totalExpenses.toFixed(2),
        skillsAcquired: training.skillsAcquired?.length || 0
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="trainings-export.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting trainings to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export trainings to Excel'
    });
  }
};

// Export payments to Excel
export const exportPaymentsExcel = async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(filter)
      .populate('candidate', 'name candidateId email')
      .populate('processedBy', 'name')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments');

    worksheet.columns = [
      { header: 'Payment ID', key: 'paymentId', width: 15 },
      { header: 'Candidate Name', key: 'candidateName', width: 25 },
      { header: 'Candidate ID', key: 'candidateId', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Payment Date', key: 'paymentDate', width: 15 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Transaction ID', key: 'transactionId', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Processed By', key: 'processedBy', width: 20 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    payments.forEach(payment => {
      worksheet.addRow({
        paymentId: payment.paymentId,
        candidateName: payment.candidate?.name || '',
        candidateId: payment.candidate?.candidateId || '',
        amount: payment.amount,
        type: payment.type,
        paymentDate: new Date(payment.paymentDate).toLocaleDateString(),
        paymentMode: payment.paymentMode,
        transactionId: payment.transactionId || '',
        status: payment.status,
        month: payment.month,
        year: payment.year,
        processedBy: payment.processedBy?.name || '',
        description: payment.description || ''
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-export.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting payments to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export payments to Excel'
    });
  }
};

// Export comprehensive report
export const exportComprehensiveReport = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    const candidatesCount = await Candidate.countDocuments();
    const trainingsCount = await Training.countDocuments();
    const paymentsTotal = await Payment.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    summarySheet.addRow(['Total Candidates', candidatesCount]);
    summarySheet.addRow(['Total Trainings', trainingsCount]);
    summarySheet.addRow(['Total Payments', paymentsTotal[0]?.total || 0]);
    summarySheet.addRow(['Report Generated', new Date().toLocaleDateString()]);

    // Candidates by status
    const candidatesByStatus = await Candidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusSheet = workbook.addWorksheet('Candidates by Status');
    statusSheet.addRow(['Status', 'Count']);
    candidatesByStatus.forEach(item => {
      statusSheet.addRow([item._id, item.count]);
    });

    // Monthly payments
    const monthlyPayments = await Payment.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const paymentsSheet = workbook.addWorksheet('Monthly Payments');
    paymentsSheet.addRow(['Year', 'Month', 'Total Amount']);
    monthlyPayments.forEach(item => {
      paymentsSheet.addRow([item._id.year, item._id.month, item.total]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="htd-comprehensive-report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting comprehensive report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export comprehensive report'
    });
  }
};

// Helper functions
function calculateCandidateExperience(candidate) {
  if (!candidate.experience || candidate.experience.length === 0) {
    return { itExperienceMonths: 0, nonItExperienceMonths: 0, totalExperienceMonths: 0 };
  }

  const itExperience = candidate.experience
    .filter(exp => exp.type === "IT")
    .reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      const diffTime = Math.abs(end - start);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      return total + diffMonths;
    }, 0);

  const nonItExperience = candidate.experience
    .filter(exp => exp.type === "NON-IT")
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
}

function calculateTrainingDuration(training) {
  if (!training.startDate) return 0;
  
  const endDate = training.actualEndDate || training.expectedEndDate || new Date();
  const diffTime = Math.abs(endDate - training.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateAverageRating(training) {
  if (!training.evaluations || training.evaluations.length === 0) return 0;
  
  const totalRating = training.evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0);
  return totalRating / training.evaluations.length;
}
