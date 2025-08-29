import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';

export const getPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '', resource = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (resource) {
      query.resource = resource;
    }
    
    const permissions = await Permission.find(query)
      .sort({ resource: 1, action: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Permission.countDocuments(query);
    
    res.json({
      permissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Failed to fetch permissions' });
  }
};

export const getPermission = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permission = await Permission.findById(id);
    
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    res.json(permission);
  } catch (error) {
    console.error('Get permission error:', error);
    res.status(500).json({ message: 'Failed to fetch permission' });
  }
};

export const createPermission = async (req, res) => {
  try {
    const { name, description, resource, action } = req.body;
    
    // Check if permission already exists
    const existingPermission = await Permission.findOne({ name });
    if (existingPermission) {
      return res.status(400).json({ message: 'Permission with this name already exists' });
    }
    
    // Check if resource-action combination already exists
    const existingCombination = await Permission.findOne({ resource, action });
    if (existingCombination) {
      return res.status(400).json({ message: 'Permission for this resource and action already exists' });
    }
    
    const permission = new Permission({
      name,
      description,
      resource,
      action,
    });
    
    await permission.save();
    
    res.status(201).json({
      message: 'Permission created successfully',
      permission,
    });
  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({ message: 'Failed to create permission' });
  }
};

export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, resource, action } = req.body;
    
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Check if name already exists (excluding current permission)
    if (name !== permission.name) {
      const existingPermission = await Permission.findOne({ name, _id: { $ne: id } });
      if (existingPermission) {
        return res.status(400).json({ message: 'Permission with this name already exists' });
      }
    }
    
    // Check if resource-action combination already exists (excluding current permission)
    if (resource !== permission.resource || action !== permission.action) {
      const existingCombination = await Permission.findOne({ 
        resource, 
        action, 
        _id: { $ne: id } 
      });
      if (existingCombination) {
        return res.status(400).json({ message: 'Permission for this resource and action already exists' });
      }
    }
    
    // Update fields
    permission.name = name;
    permission.description = description;
    permission.resource = resource;
    permission.action = action;
    
    await permission.save();
    
    res.json({
      message: 'Permission updated successfully',
      permission,
    });
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({ message: 'Failed to update permission' });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Check if permission is being used by any users
    const usersWithPermission = await UserPermission.countDocuments({ permissionId: id });
    if (usersWithPermission > 0) {
      return res.status(400).json({ 
        message: `Cannot delete permission. It is currently assigned to ${usersWithPermission} user(s)` 
      });
    }
    
    await Permission.findByIdAndDelete(id);
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ message: 'Failed to delete permission' });
  }
};

export const getPermissionStats = async (req, res) => {
  try {
    // Get total permissions
    const totalPermissions = await Permission.countDocuments();
    
    // Get permissions by resource
    const permissionsByResource = await Permission.aggregate([
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
          actions: { $addToSet: '$action' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get most used permissions
    const mostUsedPermissions = await UserPermission.aggregate([
      {
        $group: {
          _id: '$permissionId',
          userCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'permissions',
          localField: '_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      {
        $unwind: '$permission'
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          userCount: 1,
          name: '$permission.name',
          resource: '$permission.resource',
          action: '$permission.action'
        }
      }
    ]);
    
    res.json({
      totalPermissions,
      permissionsByResource,
      mostUsedPermissions,
    });
  } catch (error) {
    console.error('Get permission stats error:', error);
    res.status(500).json({ message: 'Failed to fetch permission statistics' });
  }
};