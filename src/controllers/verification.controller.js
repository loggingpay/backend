const { verifyEmailToken } = require("../models/verification.model");

const verifyEmailController = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const result = await verifyEmailToken(token);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid, expired, or already used",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Email verification failed",
    });
  }
};

module.exports = {
  verifyEmailController,
};
