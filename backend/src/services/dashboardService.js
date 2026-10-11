const { query } = require('../../db');
const AppError = require('../utils/AppError');

const getEmployeeDashboard = async (user) => {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
        COALESCE(SUM(amount), 0)::numeric(12, 2) AS total_amount_claimed
      FROM vouchers
      WHERE created_by = $1
    `,
    [user.id]
  );

  return result.rows[0];
};

const getDirectorDashboard = async () => {
  const [statsResult, activitiesResult] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND approval_date::date = CURRENT_DATE)::int AS approved_today,
        COUNT(*) FILTER (WHERE status = 'REJECTED' AND updated_at::date = CURRENT_DATE)::int AS rejected_today,
        COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_APPROVAL'), 0)::numeric(12, 2) AS total_pending_amount
      FROM vouchers
    `),
    query(`
      SELECT id, voucher_number, employee_name, status, amount, updated_at
      FROM vouchers
      ORDER BY updated_at DESC
      LIMIT 5
    `),
  ]);

  return {
    ...statsResult.rows[0],
    recent_activities: activitiesResult.rows,
  };
};

const getAccountsDashboard = async () => {
  const [statsResult, approvedResult] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0)::numeric(12, 2) AS total_approved_amount
      FROM vouchers
    `),
    query(`
      SELECT id, voucher_number, employee_name, department, category, expense_date, amount, approval_date
      FROM vouchers
      WHERE status = 'APPROVED'
      ORDER BY approval_date DESC NULLS LAST, updated_at DESC
      LIMIT 5
    `),
  ]);

  return {
    ...statsResult.rows[0],
    recent_approved_vouchers: approvedResult.rows,
  };
};

const getDashboard = async (user) => {
  if (user.role === 'employee') return getEmployeeDashboard(user);
  if (user.role === 'director') return getDirectorDashboard();
  if (user.role === 'accounts') return getAccountsDashboard();
  throw new AppError('You do not have permission to access this resource.', 403);
};

module.exports = { getDashboard };