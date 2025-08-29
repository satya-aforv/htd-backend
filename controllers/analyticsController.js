import Candidate from '../models/Candidate.js';
import Training from '../models/Training.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

// Get comprehensive analytics dashboard data
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { startDate, endDate, status, skillType } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get candidate analytics
    const candidateAnalytics = await getCandidateAnalytics(dateFilter, status);
    
    // Get training analytics
    const trainingAnalytics = await getTrainingAnalytics(dateFilter);
    
    // Get payment analytics
    const paymentAnalytics = await getPaymentAnalytics(dateFilter);
    
    // Get skill adoption analytics
    const skillAnalytics = await getSkillAnalytics(skillType);
    
    // Get ROI analytics
    const roiAnalytics = await getROIAnalytics();

    res.json({
      success: true,
      data: {
        candidates: candidateAnalytics,
        trainings: trainingAnalytics,
        payments: paymentAnalytics,
        skills: skillAnalytics,
        roi: roiAnalytics,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard'
    });
  }
};

// Get candidate analytics
async function getCandidateAnalytics(dateFilter, statusFilter) {
  const matchStage = { ...dateFilter };
  if (statusFilter) {
    matchStage.status = statusFilter;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        statusBreakdown: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        genderBreakdown: [
          { $group: { _id: "$gender", count: { $sum: 1 } } }
        ],
        experienceAnalysis: [
          {
            $addFields: {
              totalExperience: {
                $reduce: {
                  input: "$experience",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $divide: [
                          { $subtract: ["$$this.endDate", "$$this.startDate"] },
                          1000 * 60 * 60 * 24 * 30
                        ]
                      }
                    ]
                  }
                }
              }
            }
          },
          {
            $bucket: {
              groupBy: "$totalExperience",
              boundaries: [0, 12, 24, 36, 60, 120],
              default: "120+",
              output: {
                count: { $sum: 1 },
                avgExperience: { $avg: "$totalExperience" }
              }
            }
          }
        ],
        ageAnalysis: [
          {
            $addFields: {
              age: {
                $divide: [
                  { $subtract: [new Date(), "$dateOfBirth"] },
                  1000 * 60 * 60 * 24 * 365
                ]
              }
            }
          },
          {
            $bucket: {
              groupBy: "$age",
              boundaries: [18, 25, 30, 35, 40, 50],
              default: "50+",
              output: { count: { $sum: 1 } }
            }
          }
        ],
        monthlyHiring: [
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $limit: 12 }
        ]
      }
    }
  ];

  const result = await Candidate.aggregate(pipeline);
  return result[0];
}

// Get training analytics
async function getTrainingAnalytics(dateFilter) {
  const pipeline = [
    { $match: dateFilter },
    {
      $facet: {
        totalTrainings: [{ $count: "count" }],
        statusBreakdown: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        durationAnalysis: [
          {
            $addFields: {
              durationDays: {
                $divide: [
                  { $subtract: [
                    { $ifNull: ["$actualEndDate", "$expectedEndDate"] },
                    "$startDate"
                  ]},
                  1000 * 60 * 60 * 24
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: "$durationDays" },
              minDuration: { $min: "$durationDays" },
              maxDuration: { $max: "$durationDays" }
            }
          }
        ],
        performanceAnalysis: [
          { $unwind: "$evaluations" },
          {
            $group: {
              _id: {
                year: "$evaluations.year",
                month: "$evaluations.month"
              },
              avgRating: { $avg: "$evaluations.rating" },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ],
        skillsAcquired: [
          { $unwind: "$skillsAcquired" },
          {
            $group: {
              _id: "$skillsAcquired.name",
              count: { $sum: 1 },
              avgProficiency: {
                $avg: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$skillsAcquired.proficiency", "BEGINNER"] }, then: 1 },
                      { case: { $eq: ["$skillsAcquired.proficiency", "INTERMEDIATE"] }, then: 2 },
                      { case: { $eq: ["$skillsAcquired.proficiency", "ADVANCED"] }, then: 3 },
                      { case: { $eq: ["$skillsAcquired.proficiency", "EXPERT"] }, then: 4 }
                    ],
                    default: 1
                  }
                }
              }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]
      }
    }
  ];

  const result = await Training.aggregate(pipeline);
  return result[0];
}

// Get payment analytics
async function getPaymentAnalytics(dateFilter) {
  const pipeline = [
    { $match: dateFilter },
    {
      $facet: {
        totalPayments: [
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          }
        ],
        typeBreakdown: [
          {
            $group: {
              _id: "$type",
              total: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          },
          { $sort: { total: -1 } }
        ],
        monthlyTrend: [
          {
            $group: {
              _id: {
                year: "$year",
                month: "$month"
              },
              total: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $limit: 12 }
        ],
        statusAnalysis: [
          {
            $group: {
              _id: "$status",
              total: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ];

  const result = await Payment.aggregate(pipeline);
  return result[0];
}

// Get skill analytics
async function getSkillAnalytics(skillType) {
  const matchStage = {};
  if (skillType) {
    matchStage["skills.type"] = skillType;
  }

  const pipeline = [
    { $match: matchStage },
    { $unwind: "$skills" },
    {
      $facet: {
        skillDistribution: [
          {
            $group: {
              _id: "$skills.name",
              count: { $sum: 1 },
              types: { $addToSet: "$skills.type" },
              proficiencyLevels: { $push: "$skills.proficiency" }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ],
        proficiencyAnalysis: [
          {
            $group: {
              _id: "$skills.proficiency",
              count: { $sum: 1 }
            }
          }
        ],
        acquisitionAnalysis: [
          {
            $group: {
              _id: "$skills.acquiredDuring",
              count: { $sum: 1 }
            }
          }
        ],
        skillTypeAnalysis: [
          {
            $group: {
              _id: "$skills.type",
              count: { $sum: 1 },
              uniqueSkills: { $addToSet: "$skills.name" }
            }
          },
          {
            $addFields: {
              uniqueSkillCount: { $size: "$uniqueSkills" }
            }
          }
        ]
      }
    }
  ];

  const result = await Candidate.aggregate(pipeline);
  return result[0];
}

// Get ROI analytics
async function getROIAnalytics() {
  const pipeline = [
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "candidate",
        as: "payments"
      }
    },
    {
      $lookup: {
        from: "trainings",
        localField: "_id",
        foreignField: "candidate",
        as: "trainings"
      }
    },
    {
      $addFields: {
        totalInvestment: { $sum: "$payments.amount" },
        trainingExpenses: {
          $sum: {
            $reduce: {
              input: "$trainings",
              initialValue: 0,
              in: { $add: ["$$value", { $sum: "$$this.expenses.amount" }] }
            }
          }
        },
        totalROI: {
          $add: [
            { $sum: "$payments.amount" },
            {
              $sum: {
                $reduce: {
                  input: "$trainings",
                  initialValue: 0,
                  in: { $add: ["$$value", { $sum: "$$this.expenses.amount" }] }
                }
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: "$status",
        candidates: { $sum: 1 },
        avgInvestment: { $avg: "$totalROI" },
        totalInvestment: { $sum: "$totalROI" },
        avgTrainingExpense: { $avg: "$trainingExpenses" }
      }
    }
  ];

  const result = await Candidate.aggregate(pipeline);
  return result;
}

// Export analytics data to Excel
export const exportAnalyticsExcel = async (req, res) => {
  try {
    // This would require xlsx package
    res.json({
      success: false,
      message: 'Excel export functionality requires xlsx package installation'
    });
  } catch (error) {
    console.error('Error exporting analytics to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics to Excel'
    });
  }
};

// Get candidate performance metrics
export const getCandidatePerformanceMetrics = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const trainings = await Training.find({ candidate: candidateId });
    const payments = await Payment.find({ candidate: candidateId, status: 'COMPLETED' });

    const metrics = {
      personalInfo: {
        name: candidate.name,
        candidateId: candidate.candidateId,
        status: candidate.status
      },
      trainingMetrics: {
        totalTrainings: trainings.length,
        completedTrainings: trainings.filter(t => t.status === 'COMPLETED').length,
        averageRating: trainings.length > 0 ? 
          trainings.reduce((sum, t) => sum + t.calculateAverageRating(), 0) / trainings.length : 0,
        totalTrainingDays: trainings.reduce((sum, t) => sum + t.calculateDuration(), 0),
        skillsAcquired: trainings.reduce((sum, t) => sum + t.skillsAcquired.length, 0)
      },
      financialMetrics: {
        totalInvestment: payments.reduce((sum, p) => sum + p.amount, 0),
        trainingExpenses: trainings.reduce((sum, t) => sum + t.calculateTotalExpenses(), 0),
        monthlyAverage: payments.length > 0 ? 
          payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0
      },
      progressTimeline: trainings.map(training => ({
        trainingId: training.trainingId,
        startDate: training.startDate,
        endDate: training.actualEndDate || training.expectedEndDate,
        status: training.status,
        rating: training.calculateAverageRating(),
        expenses: training.calculateTotalExpenses()
      }))
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching candidate performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidate performance metrics'
    });
  }
};
