const { z } = require('zod');

const voucherSchema = z.object({
  title: z.string().min(3),
  amount: z.number().positive(),
});

module.exports = {
  voucherSchema,
};
