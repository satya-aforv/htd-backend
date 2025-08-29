import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';
import Permission from '../models/Permission.js';

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', designation } = req.query;
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    } : {};
    // Add designation filter if provided
    if (designation) {
      query.designation = designation;
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    // Get permissions count for each user
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissionsCount = await UserPermission.countDocuments({ userId: user._id });
        return {
          ...user,
          permissionsCount
        };
      })
    );
    
    const total = await User.countDocuments(query);
    
    res.json({
      users: usersWithPermissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, isActive = true, designation, employeeNumber, contactNumber, gender = 'MALE', location } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const existingEmpNum = await User.findOne({ employeeNumber });
    if (existingEmpNum) {
      return res.status(400).json({ message: 'User with this employee number already exists' });
    }
    if (!designation) {
      return res.status(400).json({ message: 'Designation is required' });
    }
    if (!employeeNumber) {
      return res.status(400).json({ message: 'Employee Number is required' });
    }
    if (!contactNumber) {
      return res.status(400).json({ message: 'Contact Number is required' });
    }
    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }
    const user = new User({
      name,
      email,
      password,
      isActive,
      designation,
      employeeNumber,
      contactNumber,
      gender,
      location,
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, isActive, designation, employeeNumber, contactNumber, gender, location } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Check if email already exists (excluding current user)
    if (email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }
    if (employeeNumber && employeeNumber !== user.employeeNumber) {
      const existingEmpNum = await User.findOne({ employeeNumber, _id: { $ne: id } });
      if (existingEmpNum) {
        return res.status(400).json({ message: 'User with this employee number already exists' });
      }
    }
    // Update fields
    user.name = name;
    user.email = email;
    user.isActive = isActive;
    if (designation) user.designation = designation;
    if (employeeNumber) user.employeeNumber = employeeNumber;
    if (contactNumber) user.contactNumber = contactNumber;
    if (gender) user.gender = gender;
    if (location) user.location = location;
    // Only update password if provided
    if (password) {
      user.password = password;
    }
    await user.save();
    res.json({
      message: 'User updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user's permissions first
    await UserPermission.deleteMany({ userId: id });
    
    // Delete user
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const getUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const userPermissions = await UserPermission.find({ userId: id })
      .populate('permissionId');
    
    res.json(userPermissions.map(up => up.permissionId));
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ message: 'Failed to fetch user permissions' });
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify all permissions exist
    const validPermissions = await Permission.find({ _id: { $in: permissions } });
    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({ message: 'Some permissions are invalid' });
    }
    
    // Remove existing permissions
    await UserPermission.deleteMany({ userId: id });
    
    // Add new permissions
    const userPermissions = permissions.map(permissionId => ({
      userId: id,
      permissionId,
    }));
    
    if (userPermissions.length > 0) {
      await UserPermission.insertMany(userPermissions);
    }
    
    res.json({ message: 'User permissions updated successfully' });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ message: 'Failed to update user permissions' });
  }
};