const AppError = require('../utils/AppError');
const voucherService = require('../services/voucherService');
const {
  createVoucherSchema,
  updateVoucherSchema,
  rejectVoucherSchema,
  submitVoucherSchema,
  approveVoucherSchema,
} = require('../validators/voucherValidator');

const createVoucher = async (req, res, next) => {
  try {
    const payload = createVoucherSchema.parse(req.body);
    const voucher = await voucherService.createVoucher(req.user, payload);

    res.status(201).json({
      success: true,
      message: 'Voucher created as DRAFT.',
      voucher,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

const getVouchers = async (req, res, next) => {
  try {
    const result = await voucherService.listVouchers(req.user, req.query);

    res.status(200).json({
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

const getVoucherById = async (req, res, next) => {
  try {
    const voucher = await voucherService.getVoucherById(req.user, req.params.id);

    res.status(200).json({
      success: true,
      voucher,
    });
  } catch (error) {
    next(error);
  }
};

const updateVoucher = async (req, res, next) => {
  try {
    const payload = updateVoucherSchema.parse(req.body);
    const voucher = await voucherService.updateVoucher(req.user, req.params.id, payload);

    res.status(200).json({
      success: true,
      message: 'Voucher updated successfully.',
      voucher,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

const deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await voucherService.deleteVoucher(req.user, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully.',
      voucher,
    });
  } catch (error) {
    next(error);
  }
};

const submitVoucher = async (req, res, next) => {
  try {
    const payload = submitVoucherSchema.parse(req.body || {});
    const signature = req.file ? `/uploads/${req.file.filename}` : payload.employee_signature;

    const voucher = await voucherService.submitVoucher(req.user, req.params.id, {
      employee_signature: signature,
    });

    res.status(200).json({
      success: true,
      message: 'Voucher submitted for approval.',
      voucher,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

const approveVoucher = async (req, res, next) => {
  try {
    const payload = approveVoucherSchema.parse(req.body || {});
    const signature = req.file ? `/uploads/${req.file.filename}` : payload.director_signature;

    const voucher = await voucherService.approveVoucher(req.user, req.params.id, {
      director_signature: signature,
    });

    res.status(200).json({
      success: true,
      message: 'Voucher approved successfully.',
      voucher,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

const rejectVoucher = async (req, res, next) => {
  try {
    const payload = rejectVoucherSchema.parse(req.body || {});
    const reason = payload.rejection_reason || payload.reason;

    const voucher = await voucherService.rejectVoucher(req.user, req.params.id, {
      rejection_reason: reason,
    });

    res.status(200).json({
      success: true,
      message: 'Voucher rejected successfully.',
      voucher,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new AppError(error.errors[0].message, 400));
    }

    next(error);
  }
};

module.exports = {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  submitVoucher,
  approveVoucher,
  rejectVoucher,
};
