import User from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { sendResetPasswordEmail } from '../config/email.js';
import { getUserPermissions } from '../middleware/permissions.js';
import { sanitizeQuery } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({ name, email, password });
    await user.save();
    
    // Generate tokens
    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    // Get user permissions
    const permissions = await getUserPermissions(user._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      permissions,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    // Get user permissions
    const permissions = await getUserPermissions(user._id);
    
    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      permissions,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        message: 'Refresh token required',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and verify refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({ 
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken({ userId: user._id });
    const newRefreshToken = generateRefreshToken({ userId: user._id });
    
    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();
    
    // Get user permissions
    const permissions = await getUserPermissions(user._id);
    
    res.json({
      message: 'Tokens refreshed successfully',
      user: user.toJSON(),
      permissions,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Refresh token has expired',
        error: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    res.status(500).json({ 
      message: 'Token refresh failed',
      error: 'REFRESH_ERROR'
    });
  }
};

export const logout = async (req, res) => {
  try {
    const user = req.user;
    
    // Clear refresh token
    user.refreshToken = null;
    await user.save();
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = uuidv4();
    
    // Save reset token
    const passwordResetToken = new PasswordResetToken({
      userId: user._id,
      token: resetToken,
    });
    await passwordResetToken.save();
    
    // Send email
    await sendResetPasswordEmail(user.email, resetToken, user.name);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find valid reset token
    const resetToken = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    
    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Find user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Mark token as used
    resetToken.used = true;
    await resetToken.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const permissions = await getUserPermissions(user._id);
    
    res.json({
      user: user.toJSON(),
      permissions,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Password change failed' });
  }
};