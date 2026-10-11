const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../db');
const AppError = require('../utils/AppError');
const { loginSchema } = require('../validators/authValidator');

const loginUser = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const email = validatedData.email.trim().toLowerCase();

    const result = await query(
      `
        SELECT id, full_name, email, password_hash, role, department, signature_path, created_at, updated_at
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
      process.env.JWT_SECRET || 'dev_secret',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      signature_path: user.signature_path,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT id, full_name, email, role, department, signature_path, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  getCurrentUser,
};
