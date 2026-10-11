const { query } = require('../../db');
const AppError = require('../utils/AppError');

const VALID_STATUS_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const isEmployee = (user) => user && user.role === 'employee';
const isDirector = (user) => user && user.role === 'director';
const isAccounts = (user) => user && user.role === 'accounts';

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const getVoucherByIdHelper = async (id) => {
  const result = await query(
    `
      SELECT v.*, u.full_name AS employee_name_from_user
      FROM vouchers v
      LEFT JOIN users u ON u.id = v.created_by
      WHERE v.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const validateRequiredFields = (voucher) => {
  const requiredFields = [
    'voucher_date',
    'expense_date',
    'department',
    'title',
    'category',
    'description',
    'amount',
  ];

  for (const field of requiredFields) {
    if (voucher[field] === undefined || voucher[field] === null || String(voucher[field]).trim() === '') {
      throw new AppError(`Field "${field}" is required.`, 400);
    }
  }

  if (Number(voucher.amount) <= 0) {
    throw new AppError('Amount must be greater than 0.', 400);
  }
};

const ensureOwnVoucher = (voucher, user) => {
  if (!voucher) {
    throw new AppError('Voucher not found.', 404);
  }

  if (user.role === 'employee' && Number(voucher.created_by) !== Number(user.id)) {
    throw new AppError('You can only access your own vouchers.', 403);
  }
};

const ensureDraftEditable = (voucher) => {
  if (voucher.status !== 'DRAFT') {
    throw new AppError('Only drafts can be edited or deleted.', 400);
  }
};

const ensureTransitionAllowed = (currentStatus, nextStatus) => {
  if (!VALID_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${nextStatus}.`,
      400
    );
  }
};

const buildVoucherFilters = (user, queryParams) => {
  const filters = [];
  const values = [];
  const addFilter = (condition, value) => {
    values.push(value);
    filters.push(condition.replace('?', `$${values.length}`));
  };

  if (user.role === 'employee') {
    addFilter('v.created_by = ?', user.id);
  }

  if (queryParams.search) {
    values.push(`%${queryParams.search}%`);
    const parameter = `$${values.length}`;
    filters.push(`(v.voucher_number ILIKE ${parameter} OR v.employee_name ILIKE ${parameter})`);
  }

  if (queryParams.department) addFilter('v.department ILIKE ?', queryParams.department);
  if (queryParams.category) addFilter('v.category ILIKE ?', queryParams.category);
  if (queryParams.status) addFilter('v.status = ?', queryParams.status);
  if (queryParams.fromDate) addFilter('v.expense_date >= ?', queryParams.fromDate);
  if (queryParams.toDate) addFilter('v.expense_date <= ?', queryParams.toDate);
  if (queryParams.minAmount !== undefined) addFilter('v.amount >= ?', queryParams.minAmount);
  if (queryParams.maxAmount !== undefined) addFilter('v.amount <= ?', queryParams.maxAmount);

  const allowedSortFields = {
    created_at: 'v.created_at',
    amount: 'v.amount',
    expense_date: 'v.expense_date',
    status: 'v.status',
  };

  return {
    whereClause: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    values,
    sortField: allowedSortFields[queryParams.sortBy] || allowedSortFields.created_at,
    direction: queryParams.order === 'asc' ? 'ASC' : 'DESC',
  };
};

const parsePositiveInteger = (value, fallback, field, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AppError(`${field} must be an integer between 1 and ${max}.`, 400);
  }
  return parsed;
};

const parseAmountFilter = (value, field) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(`${field} must be a non-negative number.`, 400);
  }
  return parsed;
};

const validateDateFilter = (value, field) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`${field} must use YYYY-MM-DD format.`, 400);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(`${field} must be a valid date.`, 400);
  }
};

const listVouchers = async (user, queryParams) => {
  const page = parsePositiveInteger(queryParams.page, 1, 'page');
  const limit = parsePositiveInteger(queryParams.limit, 20, 'limit', 100);
  const minAmount = parseAmountFilter(queryParams.minAmount, 'minAmount');
  const maxAmount = parseAmountFilter(queryParams.maxAmount, 'maxAmount');
  const stringFilters = ['search', 'department', 'category', 'status', 'fromDate', 'toDate', 'sortBy', 'order'];

  for (const field of stringFilters) {
    if (queryParams[field] !== undefined && typeof queryParams[field] !== 'string') {
      throw new AppError(`${field} must be a single string value.`, 400);
    }
  }

  if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
    throw new AppError('minAmount cannot be greater than maxAmount.', 400);
  }

  const status = queryParams.status?.toUpperCase();
  if (status && !['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(status)) {
    throw new AppError('status must be DRAFT, PENDING_APPROVAL, APPROVED, or REJECTED.', 400);
  }
  if (queryParams.order && !['asc', 'desc'].includes(queryParams.order.toLowerCase())) {
    throw new AppError('order must be asc or desc.', 400);
  }

  validateDateFilter(queryParams.fromDate, 'fromDate');
  validateDateFilter(queryParams.toDate, 'toDate');
  if (queryParams.fromDate && queryParams.toDate && queryParams.fromDate > queryParams.toDate) {
    throw new AppError('fromDate cannot be later than toDate.', 400);
  }

  const filters = buildVoucherFilters(user, {
    ...queryParams,
    status,
    order: queryParams.order?.toLowerCase(),
    minAmount,
    maxAmount,
  });
  const whereClause = filters.whereClause;
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM vouchers v ${whereClause}`, filters.values),
    query(
      `
        SELECT v.*
        FROM vouchers v
        ${whereClause}
        ORDER BY ${filters.sortField} ${filters.direction}
        LIMIT $${filters.values.length + 1}
        OFFSET $${filters.values.length + 2}
      `,
      [...filters.values, limit, offset]
    ),
  ]);

  const total = countResult.rows[0].total;
  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const createVoucher = async (user, payload) => {
  if (!isEmployee(user)) {
    throw new AppError('Only employees can create vouchers.', 403);
  }

  const cleanPayload = {
    voucher_date: payload.voucher_date,
    expense_date: payload.expense_date,
    department: normalizeString(payload.department),
    title: normalizeString(payload.title),
    category: normalizeString(payload.category),
    description: normalizeString(payload.description),
    amount: Number(payload.amount),
    employee_id: normalizeString(payload.employee_id),
    employee_signature: payload.employee_signature || null,
    employee_name: user.full_name || normalizeString(payload.employee_name),
  };

  validateRequiredFields(cleanPayload);

  const result = await query(
    `
      INSERT INTO vouchers (
        voucher_date,
        expense_date,
        department,
        title,
        category,
        description,
        amount,
        employee_name,
        employee_id,
        employee_signature,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
    [
      cleanPayload.voucher_date,
      cleanPayload.expense_date,
      cleanPayload.department,
      cleanPayload.title,
      cleanPayload.category,
      cleanPayload.description,
      cleanPayload.amount,
      cleanPayload.employee_name,
      cleanPayload.employee_id || null,
      cleanPayload.employee_signature,
      user.id,
    ]
  );

  return result.rows[0];
};

const getVoucherById = async (user, id) => {
  const voucher = await getVoucherByIdHelper(id);
  ensureOwnVoucher(voucher, user);

  return voucher;
};

const updateVoucher = async (user, id, payload) => {
  const voucher = await getVoucherByIdHelper(id);
  ensureOwnVoucher(voucher, user);
  ensureDraftEditable(voucher);

  const nextPayload = {
    voucher_date: payload.voucher_date ?? voucher.voucher_date,
    expense_date: payload.expense_date ?? voucher.expense_date,
    department: normalizeString(payload.department ?? voucher.department),
    title: normalizeString(payload.title ?? voucher.title),
    category: normalizeString(payload.category ?? voucher.category),
    description: normalizeString(payload.description ?? voucher.description),
    amount: payload.amount !== undefined ? Number(payload.amount) : Number(voucher.amount),
    employee_id: payload.employee_id !== undefined ? normalizeString(payload.employee_id) : voucher.employee_id,
    employee_signature: payload.employee_signature ?? voucher.employee_signature,
    employee_name: normalizeString(payload.employee_name ?? voucher.employee_name),
  };

  validateRequiredFields(nextPayload);

  const result = await query(
    `
      UPDATE vouchers
      SET 
        voucher_date = $1,
        expense_date = $2,
        department = $3,
        title = $4,
        category = $5,
        description = $6,
        amount = $7,
        employee_id = $8,
        employee_signature = $9,
        employee_name = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `,
    [
      nextPayload.voucher_date,
      nextPayload.expense_date,
      nextPayload.department,
      nextPayload.title,
      nextPayload.category,
      nextPayload.description,
      nextPayload.amount,
      nextPayload.employee_id || null,
      nextPayload.employee_signature || null,
      nextPayload.employee_name,
      id,
    ]
  );

  return result.rows[0];
};

const deleteVoucher = async (user, id) => {
  const voucher = await getVoucherByIdHelper(id);
  ensureOwnVoucher(voucher, user);
  ensureDraftEditable(voucher);

  await query('DELETE FROM vouchers WHERE id = $1', [id]);
  return voucher;
};

const submitVoucher = async (user, id, payload = {}) => {
  const voucher = await getVoucherByIdHelper(id);
  ensureOwnVoucher(voucher, user);

  if (voucher.status !== 'DRAFT') {
    throw new AppError('Only DRAFT vouchers can be submitted.', 400);
  }

  const signatureFromUpload = payload.employee_signature || null;
  const signature = signatureFromUpload || user.signature_path || voucher.employee_signature;

  if (!signature) {
    throw new AppError('Employee signature is required before submitting a voucher.', 400);
  }

  if (!voucher.voucher_date || !voucher.expense_date || !voucher.department || !voucher.title || !voucher.category || !voucher.description || Number(voucher.amount) <= 0) {
    throw new AppError('Required voucher fields are missing or invalid before submission.', 400);
  }

  const result = await query(
    `
      UPDATE vouchers
      SET employee_signature = COALESCE($1, employee_signature),
          status = 'PENDING_APPROVAL',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [signature, id]
  );

  return result.rows[0];
};

const approveVoucher = async (user, id, payload = {}) => {
  if (!isDirector(user)) {
    throw new AppError('Only directors can approve vouchers.', 403);
  }

  const voucher = await getVoucherByIdHelper(id);
  if (!voucher) {
    throw new AppError('Voucher not found.', 404);
  }

  if (voucher.status !== 'PENDING_APPROVAL') {
    throw new AppError('Only vouchers pending approval can be approved.', 400);
  }

  const signatureFromUpload = payload.director_signature || null;
  const signature = signatureFromUpload || user.signature_path || voucher.director_signature;

  if (!signature) {
    throw new AppError('Director signature is required before approval.', 400);
  }

  const result = await query(
    `
      UPDATE vouchers
      SET director_signature = $1,
          approval_date = NOW(),
          rejection_reason = NULL,
          status = 'APPROVED',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [signature, id]
  );

  return result.rows[0];
};

const rejectVoucher = async (user, id, payload = {}) => {
  if (!isDirector(user)) {
    throw new AppError('Only directors can reject vouchers.', 403);
  }

  const voucher = await getVoucherByIdHelper(id);
  if (!voucher) {
    throw new AppError('Voucher not found.', 404);
  }

  if (voucher.status !== 'PENDING_APPROVAL') {
    throw new AppError('Only vouchers pending approval can be rejected.', 400);
  }

  const reason = normalizeString(payload.rejection_reason || payload.reason || '');
  if (!reason || reason.length < 5) {
    throw new AppError('A rejection reason is required and must be at least 5 characters long.', 400);
  }

  const result = await query(
    `
      UPDATE vouchers
      SET rejection_reason = $1,
          status = 'REJECTED',
          approval_date = NULL,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [reason, id]
  );

  return result.rows[0];
};

module.exports = {
  createVoucher,
  listVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  submitVoucher,
  approveVoucher,
  rejectVoucher,
  isEmployee,
  isDirector,
  isAccounts,
};
