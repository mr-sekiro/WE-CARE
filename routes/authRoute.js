const express = require("express");

const authValidator = require("../utils/validators/authValidator");
const {
  signup,
  emailVerification,
  verifyEmailVerificationCode,
  login,
  forgotPassword,
  // uploadUserPhoto,
  // resizePhoto,
  // cloudinaryUploader,
  verifyResetCode,
  resetPassword,
  logout,
  protect,
} = require("../services/authService");

const router = express.Router();

router.post(
  "/signup",
  // uploadUserPhoto,
  // resizePhoto,
  // cloudinaryUploader,
  authValidator.signupUserValidator,
  signup
);
router.post("/emailVerification", protect, emailVerification);
router.post(
  "/verifyEmailVerificationCode",
  authValidator.verifyEmailVerificationCodeValidator,
  verifyEmailVerificationCode
);
router.post("/login", authValidator.loginUserValidator, login);
router.post(
  "/forgotPassword",
  authValidator.forgotPasswordUserValidator,
  forgotPassword
);
router.post(
  "/verifyResetCode",
  authValidator.verifyResetCodeValidator,
  verifyResetCode
);
router.post(
  "/resetPassword",
  protect,
  authValidator.resetPasswordValidator,
  resetPassword
);
router.post("/logout", protect, logout);

module.exports = router;
