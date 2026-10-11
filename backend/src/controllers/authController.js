const loginUser = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Auth controller ready' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
};
