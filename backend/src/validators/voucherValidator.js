const { z } = require('zod');

const createVoucherSchema = z.object({
  voucher_date: z.string().min(1, 'voucher_date is required.'),
  expense_date: z.string().min(1, 'expense_date is required.'),
  department: z.string().trim().min(1, 'department is required.'),
  title: z.string().trim().min(3, 'title must be at least 3 characters long.'),
  category: z.string().trim().min(1, 'category is required.'),
  description: z.string().trim().min(5, 'description must be at least 5 characters long.'),
  amount: z
    .union([
      z.string().min(1, 'amount is required.'),
      z.number().positive('amount must be greater than 0'),
    ])
    .transform((value) => (typeof value === 'string' ? Number(value) : value)),
  employee_id: z.string().trim().optional().or(z.literal('')),
  employee_signature: z.string().optional(),
  employee_name: z.string().trim().optional(),
});

const updateVoucherSchema = createVoucherSchema.partial();

const rejectVoucherSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(5, 'rejection_reason must be at least 5 characters long.')
    .optional(),
  reason: z.string().trim().min(5, 'reason must be at least 5 characters long.').optional(),
});

const submitVoucherSchema = z.object({
  employee_signature: z.string().optional(),
});

const approveVoucherSchema = z.object({
  director_signature: z.string().optional(),
});

module.exports = {
  createVoucherSchema,
  updateVoucherSchema,
  rejectVoucherSchema,
  submitVoucherSchema,
  approveVoucherSchema,
};
