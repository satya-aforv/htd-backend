// server/controllers/dashboardController.js
import State from '../models/State.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Doctor from '../models/Doctor.js';

import HospitalContact from '../models/HospitalContact.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';
import EmployeeTravelLog from '../models/EmployeeTravelLog.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's permissions
    const userPermissions = await UserPermission.find({ userId })
      .populate('permissionId');
    
    const permissions = userPermissions.map(up => ({
      resource: up.permissionId.resource,
      action: up.permissionId.action,
      name: up.permissionId.name
    }));
    
    // Group permissions by resource
    const resourcePermissions = {};
    permissions.forEach(perm => {
      if (!resourcePermissions[perm.resource]) {
        resourcePermissions[perm.resource] = [];
      }
      resourcePermissions[perm.resource].push(perm.action);
    });
    
    const dashboardCards = [];
    
    // States Statistics
    if (resourcePermissions.states && resourcePermissions.states.includes('view')) {
      try {
        const totalStates = await State.countDocuments();
        const activeStates = await State.countDocuments({ isActive: true });
        const inactiveStates = totalStates - activeStates;
        
        // Get recent states (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentStates = await State.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get total population and area
        const statesData = await State.find({}, 'population area');
        const totalPopulation = statesData.reduce((sum, state) => sum + (state.population || 0), 0);
        const totalArea = statesData.reduce((sum, state) => sum + (state.area || 0), 0);
        
        dashboardCards.push({
          id: 'states',
          title: 'States',
          resource: 'states',
          icon: 'MapPin',
          color: 'blue',
          stats: {
            total: totalStates,
            active: activeStates,
            inactive: inactiveStates,
            recent: recentStates,
            totalPopulation,
            totalArea
          },
          actions: resourcePermissions.states,
          route: '/states',
          description: 'Geographical states and regions'
        });
      } catch (error) {
        console.error('Error fetching states stats:', error);
      }
    }
    
    // Users Statistics
    if (resourcePermissions.users && resourcePermissions.users.includes('view')) {
      try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = totalUsers - activeUsers;
        
        // Get recent users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get users with permissions count
        const usersWithPermissions = await UserPermission.distinct('userId');
        const usersWithoutPermissions = totalUsers - usersWithPermissions.length;
        
        dashboardCards.push({
          id: 'users',
          title: 'Users',
          resource: 'users',
          icon: 'Users',
          color: 'green',
          stats: {
            total: totalUsers,
            active: activeUsers,
            inactive: inactiveUsers,
            recent: recentUsers,
            withPermissions: usersWithPermissions.length,
            withoutPermissions: usersWithoutPermissions
          },
          actions: resourcePermissions.users,
          route: '/users',
          description: 'System users and administrators'
        });
      } catch (error) {
        console.error('Error fetching users stats:', error);
      }
    }
    
    // Hospitals Statistics
    if (resourcePermissions.hospitals && resourcePermissions.hospitals.includes('view')) {
      try {
        const totalHospitals = await Hospital.countDocuments();
        const activeHospitals = await Hospital.countDocuments({ isActive: true });
        const inactiveHospitals = totalHospitals - activeHospitals;
        
        // Get recent hospitals (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentHospitals = await Hospital.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get total contacts
        const totalContacts = await HospitalContact.countDocuments();
        const activeContacts = await HospitalContact.countDocuments({ isActive: true });
        
        // Get hospitals by state
        const hospitalsByState = await Hospital.aggregate([
          {
            $lookup: {
              from: 'states',
              localField: 'state',
              foreignField: '_id',
              as: 'stateInfo'
            }
          },
          {
            $group: {
              _id: '$stateInfo.name',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 5
          }
        ]);
        
        dashboardCards.push({
          id: 'hospitals',
          title: 'Hospitals',
          resource: 'hospitals',
          icon: 'Building2',
          color: 'purple',
          stats: {
            total: totalHospitals,
            active: activeHospitals,
            inactive: inactiveHospitals,
            recent: recentHospitals,
            totalContacts,
            activeContacts,
            topStates: hospitalsByState
          },
          actions: resourcePermissions.hospitals,
          route: '/hospitals',
          description: 'Healthcare facilities and contacts'
        });
      } catch (error) {
        console.error('Error fetching hospitals stats:', error);
      }
    }
    // Portfolios Statistics
    if (resourcePermissions.portfolios && resourcePermissions.portfolios.includes('view')) {
      try {
        const Portfolio = (await import('../models/Portfolio.js')).default;
        const totalPortfolios = await Portfolio.countDocuments();
        const activePortfolios = await Portfolio.countDocuments({ isActive: true });
        const inactivePortfolios = totalPortfolios - activePortfolios;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPortfolios = await Portfolio.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        dashboardCards.push({
          id: 'portfolios',
          title: 'Portfolios',
          resource: 'portfolios',
          icon: 'FolderOpen',
          color: 'orange',
          stats: {
            total: totalPortfolios,
            active: activePortfolios,
            inactive: inactivePortfolios,
            recent: recentPortfolios
          },
          actions: resourcePermissions.portfolios,
          route: '/portfolios',
          description: 'Product and service portfolios'
        });
      } catch (error) {
        console.error('Error fetching portfolios stats:', error);
      }
    }

    // Principles Statistics
    if (resourcePermissions.principles && resourcePermissions.principles.includes('view')) {
      try {
        const Principle = (await import('../models/Principle.js')).default;
        const totalPrinciples = await Principle.countDocuments();
        const activePrinciples = await Principle.countDocuments({ isActive: true });
        const inactivePrinciples = totalPrinciples - activePrinciples;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPrinciples = await Principle.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        dashboardCards.push({
          id: 'principles',
          title: 'Principles',
          resource: 'principles',
          icon: 'Users',
          color: 'green',
          stats: {
            total: totalPrinciples,
            active: activePrinciples,
            inactive: inactivePrinciples,
            recent: recentPrinciples
          },
          actions: resourcePermissions.principles,
          route: '/principles',
          description: 'Principle companies and contacts'
        });
      } catch (error) {
        console.error('Error fetching principles stats:', error);
      }
    }

    // Doctors Statistics
    if (resourcePermissions.doctors && resourcePermissions.doctors.includes('view')) {
      try {
        const Doctor = (await import('../models/Doctor.js')).default;
        const totalDoctors = await Doctor.countDocuments();
        const activeDoctors = await Doctor.countDocuments({ isActive: true });
        const inactiveDoctors = totalDoctors - activeDoctors;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentDoctors = await Doctor.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        dashboardCards.push({
          id: 'doctors',
          title: 'Doctors',
          resource: 'doctors',
          icon: 'User',
          color: 'red',
          stats: {
            total: totalDoctors,
            active: activeDoctors,
            inactive: inactiveDoctors,
            recent: recentDoctors
          },
          actions: resourcePermissions.doctors,
          route: '/doctors',
          description: 'Registered doctors and their documents'
        });
      } catch (error) {
        console.error('Error fetching doctors stats:', error);
      }
    }
   
    // Logistics Logs Statistics
    if (resourcePermissions.employeeTravelLogs && resourcePermissions.employeeTravelLogs.includes('view')) {
      try {
        const totalLogs = await EmployeeTravelLog.countDocuments();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentLogs = await EmployeeTravelLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        dashboardCards.push({
          id: 'employeeTravelLogs',
          title: 'Logistics Logs',
          resource: 'employeeTravelLogs',
          icon: 'Activity', // You can change this to another icon if you prefer
          color: 'orange',
          stats: {
            total: totalLogs,
            recent: recentLogs,
          },
          actions: resourcePermissions.employeeTravelLogs,
          route: '/logistic-logs',
          description: 'Employee travel and work site logs'
        });
      } catch (error) {
        console.error('Error fetching logistics logs stats:', error);
      }
    }

    // System Overview
    const systemStats = {
      totalPermissions: await Permission.countDocuments(),
      totalResources: await Permission.distinct('resource').then(resources => resources.length),
      userPermissionsCount: permissions.length,
      accessibleResources: Object.keys(resourcePermissions).length
    };
    
    res.json({
      cards: dashboardCards,
      systemStats,
      userPermissions: resourcePermissions,
      totalCards: dashboardCards.length
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;
    
    // Get user's permissions to determine what activities they can see
    const userPermissions = await UserPermission.find({ userId })
      .populate('permissionId');
    
    const viewableResources = userPermissions
      .filter(up => up.permissionId.action === 'view')
      .map(up => up.permissionId.resource);
    
    const activities = [];
    
    // Recent States (if user can view states)
    if (viewableResources.includes('states')) {
      const recentStates = await State.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentStates.forEach(state => {
        activities.push({
          id: state._id,
          type: 'state',
          action: state.createdAt.getTime() === state.updatedAt.getTime() ? 'created' : 'updated',
          title: state.name,
          description: `State ${state.name} (${state.code})`,
          user: state.updatedBy || state.createdBy,
          timestamp: state.updatedAt,
          resource: 'states',
          icon: 'MapPin'
        });
      });
    }
    
    // Recent Users (if user can view users)
    if (viewableResources.includes('users')) {
      const recentUsers = await User.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentUsers.forEach(user => {
        activities.push({
          id: user._id,
          type: 'user',
          action: user.createdAt.getTime() === user.updatedAt.getTime() ? 'created' : 'updated',
          title: user.name,
          description: `User ${user.name} (${user.email})`,
          user: { name: user.name, _id: user._id },
          timestamp: user.updatedAt,
          resource: 'users',
          icon: 'User'
        });
      });
    }
    
    // Recent Doctors (if user can view doctors)
    if (viewableResources.includes('doctors')) {
      const recentDoctors = await Doctor.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('state', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentDoctors.forEach(doctor => {
        activities.push({
          id: doctor._id,
          type: 'doctor',
          action: doctor.createdAt.getTime() === doctor.updatedAt.getTime() ? 'created' : 'updated',
          title: doctor.name,
          description: `Doctor in ${doctor.state?.name || 'Unknown State'}`,
          user: doctor.updatedBy || doctor.createdBy,
          timestamp: doctor.updatedAt,
          resource: 'doctors',
          icon: 'Building2'
        });
      });
    }
    
    // Recent Hospitals (if user can view hospitals)
    if (viewableResources.includes('hospitals')) {
      const recentHospitals = await Hospital.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('state', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentHospitals.forEach(hospital => {
        activities.push({
          id: hospital._id,
          type: 'hospital',
          action: hospital.createdAt.getTime() === hospital.updatedAt.getTime() ? 'created' : 'updated',
          title: hospital.name,
          description: `Hospital in ${hospital.state?.name || 'Unknown State'}`,
          user: hospital.updatedBy || hospital.createdBy,
          timestamp: hospital.updatedAt,
          resource: 'hospitals',
          icon: 'Building2'
        });
      });
    }
    
    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      activities: sortedActivities,
      total: activities.length
    });
    
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};