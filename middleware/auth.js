import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        message: 'User not found or inactive',
        error: 'INVALID_USER'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Access token has expired',
        error: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid access token',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        message: 'Access token not active yet',
        error: 'TOKEN_NOT_ACTIVE'
      });
    }
    
    return res.status(401).json({ 
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};