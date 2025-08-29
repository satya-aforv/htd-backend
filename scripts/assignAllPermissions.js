import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';

dotenv.config({ path: '../.env' });

const assignAllPermissions = async (userEmail) => {
  if (!userEmail) {
    console.error('Please provide a user email.');
    process.exit(1);
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`User with email ${userEmail} not found.`);
      process.exit(1);
    }

    const permissions = await Permission.find({});
    if (permissions.length === 0) {
      console.error('No permissions found in the database.');
      process.exit(1);
    }

    const permissionIds = permissions.map(p => p._id);

    // Get existing user permissions to avoid duplicates
    const existingUserPermissions = await UserPermission.find({ userId: user._id });
    const existingPermissionIds = existingUserPermissions.map(up => up.permissionId.toString());

    const newUserPermissionIds = permissionIds.filter(id => !existingPermissionIds.includes(id.toString()));

    if (newUserPermissionIds.length === 0) {
      console.log(`User ${userEmail} already has all permissions.`);
      process.exit(0);
    }

    const userPermissionsToInsert = newUserPermissionIds.map(permissionId => ({
      userId: user._id,
      permissionId,
    }));

    await UserPermission.insertMany(userPermissionsToInsert);

    console.log(`Successfully assigned ${newUserPermissionIds.length} new permissions to ${userEmail}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error assigning permissions:', error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

const userEmail = process.argv[2];
assignAllPermissions(userEmail);
