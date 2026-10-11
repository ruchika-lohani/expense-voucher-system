const { query } = require('../../db');
const AppError = require('../utils/AppError');

const uploadSignature = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('A signature image is required.', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await query(
      `
        UPDATE users
        SET signature_path = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, full_name, email, role, department, signature_path, updated_at
      `,
      [fileUrl, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Signature uploaded successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSignature,
};
