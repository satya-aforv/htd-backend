import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';

/**
 * Get dashboard statistics for HTD system
 * @route GET /api/htd/dashboard/stats
 * @access Private
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get total and active candidates
    const totalCandidates = await Candidate.countDocuments();
    const activeCandidates = await Candidate.countDocuments({ status: 'active' });

    // Get training statistics
    const completedTrainings = await Training.countDocuments({ status: 'completed' });
    const ongoingTrainings = await Training.countDocuments({ status: 'ongoing' });

    // Get payment statistics
    const payments = await Payment.find();
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Get current month payments
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();
    
    const currentMonthPayments = await Payment.find({
      month: currentMonth.toString(),
      year: currentYear
    });
    const monthlyPayments = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get candidates by status
    const candidatesByStatus = await Candidate.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      }
    ]);

    // Get trainings by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    
    const trainingsByMonth = await Training.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $arrayElemAt: [
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                { $subtract: ['$_id.month', 1] }
              ]},
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          count: 1
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent candidates (last 5)
    const recentCandidates = await Candidate.find()
      .select('name email status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get upcoming payments (next 5)
    const upcomingPayments = await Payment.find({
      paymentDate: { $gte: new Date() },
      status: { $ne: 'paid' }
    })
      .populate('candidateId', 'name')
      .select('candidateId amount type status paymentDate')
      .sort({ paymentDate: 1 })
      .limit(5);

    res.json({
      totalCandidates,
      activeCandidates,
      completedTrainings,
      ongoingTrainings,
      totalPayments,
      monthlyPayments,
      candidatesByStatus,
      trainingsByMonth,
      recentCandidates,
      upcomingPayments
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
};