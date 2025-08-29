import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    permissions: [{
      resource: {
        type: String,
        required: true,
        enum: [
          'candidates', 'trainings', 'payments', 'analytics', 
          'users', 'roles', 'reports', 'client_profiles',
          'dashboard', 'notifications', 'settings'
        ]
      },
      actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'export', 'approve']
      }]
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isSystemRole: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const defaultRoles = [
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: [
        { resource: 'candidates', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { resource: 'trainings', actions: ['create', 'read', 'update', 'delete', 'export'] },
        { resource: 'payments', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'analytics', actions: ['read', 'export'] },
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'roles', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['read', 'export'] },
        { resource: 'client_profiles', actions: ['read', 'export'] },
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'notifications', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'settings', actions: ['read', 'update'] }
      ],
      isSystemRole: true
    },
    {
      name: 'TRAINER',
      displayName: 'Trainer/Manager',
      description: 'Update training progress, performance, and skills',
      permissions: [
        { resource: 'candidates', actions: ['read', 'update'] },
        { resource: 'trainings', actions: ['create', 'read', 'update'] },
        { resource: 'payments', actions: ['read'] },
        { resource: 'analytics', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'dashboard', actions: ['read'] }
      ],
      isSystemRole: true
    },
    {
      name: 'FINANCE_HR',
      displayName: 'Finance/HR',
      description: 'Manage stipend, salary, and financial tracking',
      permissions: [
        { resource: 'candidates', actions: ['read'] },
        { resource: 'trainings', actions: ['read'] },
        { resource: 'payments', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'analytics', actions: ['read', 'export'] },
        { resource: 'reports', actions: ['read', 'export'] },
        { resource: 'dashboard', actions: ['read'] }
      ],
      isSystemRole: true
    },
    {
      name: 'CANDIDATE',
      displayName: 'Candidate',
      description: 'View own profile, progress, and payments',
      permissions: [
        { resource: 'candidates', actions: ['read'] }, // Only own profile
        { resource: 'trainings', actions: ['read'] }, // Only own training
        { resource: 'payments', actions: ['read'] }, // Only own payments
        { resource: 'dashboard', actions: ['read'] } // Limited dashboard
      ],
      isSystemRole: true
    }
  ];

  for (const roleData of defaultRoles) {
    const existingRole = await this.findOne({ name: roleData.name });
    if (!existingRole) {
      await this.create(roleData);
    }
  }
};

// Check if role has permission for resource and action
roleSchema.methods.hasPermission = function(resource, action) {
  const permission = this.permissions.find(p => p.resource === resource);
  return permission && permission.actions.includes(action);
};

export default mongoose.model("Role", roleSchema);
