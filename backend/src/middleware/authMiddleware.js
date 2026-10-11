const jwt = require('jsonwebtoken');
const { query } = require('../../db');
const AppError = require('../utils/AppError');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');

    const result = await query(
      `
        SELECT id, full_name, email, role, department, signature_path, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [decoded.id || decoded.sub]
    );

    if (result.rows.length === 0) {
      throw new AppError('User no longer exists.', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token.', 401));
    }

    next(error);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication is required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource.', 403));
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
};
