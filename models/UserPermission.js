import mongoose from 'mongoose';

const userPermissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true,
  },
}, {
  timestamps: true,
});

// Ensure unique user-permission combination
userPermissionSchema.index({ userId: 1, permissionId: 1 }, { unique: true });

export default mongoose.model('UserPermission', userPermissionSchema);