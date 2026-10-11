const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../db');

const getUserByEmail = async (email) => {
  const result = await query(
    `
      SELECT id, full_name, email, password_hash, role, department, signature_path, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign(
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
};

module.exports = {
  getUserByEmail,
  comparePassword,
  generateToken,
};
