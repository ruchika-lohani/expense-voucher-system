const express = require('express');
const {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  submitVoucher,
  approveVoucher,
  rejectVoucher,
} = require('../controllers/voucherController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

const router = express.Router();

router.post('/', authenticate, requireRole('employee'), createVoucher);
router.get('/', authenticate, getVouchers);
router.get('/:id', authenticate, getVoucherById);
router.put('/:id', authenticate, requireRole('employee'), updateVoucher);
router.delete('/:id', authenticate, requireRole('employee'), deleteVoucher);
router.post('/:id/submit', authenticate, requireRole('employee'), upload.single('employee_signature'), submitVoucher);
router.post('/:id/approve', authenticate, requireRole('director'), upload.single('director_signature'), approveVoucher);
router.post('/:id/reject', authenticate, requireRole('director'), rejectVoucher);

module.exports = router;
