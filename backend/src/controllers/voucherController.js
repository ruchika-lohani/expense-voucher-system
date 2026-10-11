const getVouchers = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Voucher controller ready' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVouchers,
};
