import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { passwordResetRateLimit } from '../middleware/security.js';
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword
} from '../middleware/validation.js';
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
} from '../controllers/authController.js';

const router = express.Router();

// Routes with enhanced validation and security
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', passwordResetRateLimit, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetRateLimit, validatePasswordReset, resetPassword);
router.post('/change-password', authenticate, validatePasswordChange, changePassword);
router.get('/profile', authenticate, getProfile);

export default router;