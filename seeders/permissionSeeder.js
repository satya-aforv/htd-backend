import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const permissions = [
  // States permissions
  { name: 'View States', description: 'Can view states list and details', resource: 'states', action: 'view' },
  { name: 'Create States', description: 'Can create new states', resource: 'states', action: 'create' },
  { name: 'Update States', description: 'Can update existing states', resource: 'states', action: 'update' },
  { name: 'Delete States', description: 'Can delete states', resource: 'states', action: 'delete' },
  
  // Users permissions
  { name: 'View Users', description: 'Can view users list and details', resource: 'users', action: 'view' },
  { name: 'Create Users', description: 'Can create new users', resource: 'users', action: 'create' },
  { name: 'Update Users', description: 'Can update existing users', resource: 'users', action: 'update' },
  { name: 'Delete Users', description: 'Can delete users', resource: 'users', action: 'delete' },

  // Candidates permissions
  { name: 'View Candidates', description: 'Can view candidates list and details', resource: 'candidates', action: 'view' },
  { name: 'Create Candidates', description: 'Can create new candidates', resource: 'candidates', action: 'create' },
  { name: 'Update Candidates', description: 'Can update existing candidates', resource: 'candidates', action: 'update' },
  { name: 'Delete Candidates', description: 'Can delete candidates', resource: 'candidates', action: 'delete' },

  // Hospitals permissions
  { name: 'View Hospitals', description: 'Can view hospitals', resource: 'hospitals', action: 'view' },
  { name: 'Create Hospitals', description: 'Can create hospitals', resource: 'hospitals', action: 'create' },
  { name: 'Update Hospitals', description: 'Can update hospitals', resource: 'hospitals', action: 'update' },
  { name: 'Delete Hospitals', description: 'Can delete hospitals', resource: 'hospitals', action: 'delete' },

  // Principles permissions
  { name: 'View Principles', description: 'Can view principles', resource: 'principles', action: 'view' },
  { name: 'Create Principles', description: 'Can create principles', resource: 'principles', action: 'create' },
  { name: 'Update Principles', description: 'Can update principles', resource: 'principles', action: 'update' },
  { name: 'Delete Principles', description: 'Can delete principles', resource: 'principles', action: 'delete' },

  // Products permissions
  { name: 'View Products', description: 'Can view products', resource: 'products', action: 'view' },
  { name: 'Create Products', description: 'Can create products', resource: 'products', action: 'create' },
  { name: 'Update Products', description: 'Can update products', resource: 'products', action: 'update' },
  { name: 'Delete Products', description: 'Can delete products', resource: 'products', action: 'delete' },

  // Employee Travel Logs permissions
  { name: 'View Employee Travel Logs', description: 'Can view employee travel logs', resource: 'employee-travel-logs', action: 'view' },
  { name: 'Create Employee Travel Logs', description: 'Can create employee travel logs', resource: 'employee-travel-logs', action: 'create' },
  { name: 'Update Employee Travel Logs', description: 'Can update employee travel logs', resource: 'employee-travel-logs', action: 'update' },
  { name: 'Delete Employee Travel Logs', description: 'Can delete employee travel logs', resource: 'employee-travel-logs', action: 'delete' },

  // Portfolios permissions
  { name: 'View Portfolios', description: 'Can view portfolios', resource: 'portfolios', action: 'view' },
  { name: 'Create Portfolios', description: 'Can create portfolios', resource: 'portfolios', action: 'create' },
  { name: 'Update Portfolios', description: 'Can update portfolios', resource: 'portfolios', action: 'update' },
  { name: 'Delete Portfolios', description: 'Can delete portfolios', resource: 'portfolios', action: 'delete' },

  // Trainings permissions
  { name: 'View Trainings', description: 'Can view trainings', resource: 'trainings', action: 'view' },
  { name: 'Create Trainings', description: 'Can create trainings', resource: 'trainings', action: 'create' },
  { name: 'Update Trainings', description: 'Can update trainings', resource: 'trainings', action: 'update' },
  { name: 'Delete Trainings', description: 'Can delete trainings', resource: 'trainings', action: 'delete' },

  // Payments permissions
  { name: 'View Payments', description: 'Can view payments', resource: 'payments', action: 'view' },
  { name: 'Create Payments', description: 'Can create payments', resource: 'payments', action: 'create' },
  { name: 'Update Payments', description: 'Can update payments', resource: 'payments', action: 'update' },
  { name: 'Delete Payments', description: 'Can delete payments', resource: 'payments', action: 'delete' },

  // Client Profile permissions
  { name: 'View Client Profile', description: 'Can view client profile', resource: 'client-profile', action: 'view' },
  { name: 'Create Client Profile', description: 'Can create client profile', resource: 'client-profile', action: 'create' },
  { name: 'Update Client Profile', description: 'Can update client profile', resource: 'client-profile', action: 'update' },
  { name: 'Delete Client Profile', description: 'Can delete client profile', resource: 'client-profile', action: 'delete' },

  // Analytics permissions
  { name: 'View Analytics', description: 'Can view analytics', resource: 'analytics', action: 'view' },

  // Notifications permissions
  { name: 'View Notifications', description: 'Can view notifications', resource: 'notifications', action: 'view' },
  { name: 'Create Notifications', description: 'Can create notifications', resource: 'notifications', action: 'create' },
  { name: 'Update Notifications', description: 'Can update notifications', resource: 'notifications', action: 'update' },
  { name: 'Delete Notifications', description: 'Can delete notifications', resource: 'notifications', action: 'delete' },

  // Exports permissions
  { name: 'Create Exports', description: 'Can create exports', resource: 'exports', action: 'create' },

  // Dashboard permissions
  { name: 'View Dashboard', description: 'Can view dashboard', resource: 'dashboard', action: 'view' },

  // Files permissions
  { name: 'View Files', description: 'Can view files', resource: 'files', action: 'view' },
  { name: 'Create Files', description: 'Can upload files', resource: 'files', action: 'create' },
  { name: 'Delete Files', description: 'Can delete files', resource: 'files', action: 'delete' },

  // Doctors permissions
  { name: 'View Doctors', description: 'Can view doctors', resource: 'doctors', action: 'view' },
  { name: 'Create Doctors', description: 'Can create doctors', resource: 'doctors', action: 'create' },
  { name: 'Update Doctors', description: 'Can update doctors', resource: 'doctors', action: 'update' },
  { name: 'Delete Doctors', description: 'Can delete doctors', resource: 'doctors', action: 'delete' },
];

const seedPermissions = async () => {
  try {
    await connectDB();
    
    // Clear existing permissions
    await Permission.deleteMany({});
    await UserPermission.deleteMany({});
    
    // Create permissions
    const createdPermissions = await Permission.insertMany(permissions);
    console.log(`Created ${createdPermissions.length} permissions`);
    
    // Find the first user (admin)
    const adminUser = await User.findOne().sort({ createdAt: 1 });
    
    if (adminUser) {
      // Give admin user all permissions
      const userPermissions = createdPermissions.map(permission => ({
        userId: adminUser._id,
        permissionId: permission._id,
      }));
      
      await UserPermission.insertMany(userPermissions);
      console.log(`Assigned all permissions to admin user: ${adminUser.email}`);
    }
    
    console.log('Permission seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
};

seedPermissions();