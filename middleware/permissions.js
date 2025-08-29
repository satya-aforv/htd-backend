import UserPermission from '../models/UserPermission.js';
import Permission from '../models/Permission.js';

export const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;
      
      // Find user permissions
      const userPermissions = await UserPermission.find({ userId })
        .populate('permissionId');
      
      // Check if user has the required permission
      const hasPermission = userPermissions.some(up => 
        up.permissionId.resource === resource && 
        up.permissionId.action === action
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Access denied. Required permission: ${resource}_${action}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

export const getUserPermissions = async (userId) => {
  try {
    const userPermissions = await UserPermission.find({ userId })
      .populate('permissionId');
    
    return userPermissions.map(up => ({
      id: up.permissionId._id,
      name: up.permissionId.name,
      resource: up.permissionId.resource,
      action: up.permissionId.action,
    }));
  } catch (error) {
    console.error('Get user permissions error:', error);
    return [];
  }
};