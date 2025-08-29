import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'unknown');
  }
});

// Rate limiting for password reset
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':password-reset';
  }
});

// Rate limiting for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per window
  message: {
    error: 'Too many file uploads',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Account lockout tracking
const failedAttempts = new Map();
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;

export const accountLockout = (req, res, next) => {
  const key = req.ip + ':' + (req.body?.email || 'unknown');
  const attempts = failedAttempts.get(key);
  
  if (attempts && attempts.count >= MAX_ATTEMPTS) {
    const timeLeft = attempts.lockedUntil - Date.now();
    if (timeLeft > 0) {
      return res.status(423).json({
        error: 'Account temporarily locked',
        message: `Too many failed attempts. Try again in ${Math.ceil(timeLeft / 60000)} minutes`,
        lockedUntil: attempts.lockedUntil
      });
    } else {
      // Lock expired, reset attempts
      failedAttempts.delete(key);
    }
  }
  
  // Store original res.json to intercept responses
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 401 && data.message === 'Invalid credentials') {
      // Failed login attempt
      const current = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
      current.count++;
      
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_TIME;
        data.message = 'Account temporarily locked due to too many failed attempts';
        data.lockedUntil = current.lockedUntil;
        res.status(423);
      }
      
      failedAttempts.set(key, current);
    } else if (res.statusCode === 200 && req.path.includes('login')) {
      // Successful login, clear failed attempts
      failedAttempts.delete(key);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Request size limiting middleware
export const requestSizeLimit = (maxSize = '1mb') => {
  return (req, res, next) => {
    if (req.headers['content-length']) {
      const size = parseInt(req.headers['content-length']);
      const maxBytes = maxSize.includes('mb') ? 
        parseInt(maxSize) * 1024 * 1024 : 
        parseInt(maxSize) * 1024;
      
      if (size > maxBytes) {
        return res.status(413).json({
          error: 'Request too large',
          message: `Request size exceeds ${maxSize} limit`
        });
      }
    }
    next();
  };
};

// Clean up expired lockout entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, attempts] of failedAttempts.entries()) {
    if (attempts.lockedUntil > 0 && attempts.lockedUntil < now) {
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
