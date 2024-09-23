const express = require("express");
const multer = require("multer");

const upload = multer();

const nurseAuthValidator = require("../utils/validators/nurseAuthValidator");
const {
  signup,
  emailVerification,
  verifyEmailVerificationCode,
  login,
  forgotPassword,
  uploadNursePhotos,
  resizePhotos,
  cloudinaryUploader,
  verifyResetCode,
  resetPassword,
  logout,
  protectNurse,
} = require("../services/nurseAuthService");

const router = express.Router();

router.post(
  "/signup",
  uploadNursePhotos,
  resizePhotos,
  nurseAuthValidator.signupNurseValidator,
  cloudinaryUploader,
  signup
);
router.post(
  "/emailVerification",
  upload.none(),
  protectNurse,
  emailVerification
);
router.post(
  "/verifyEmailVerificationCode",
  upload.none(),
  protectNurse,
  nurseAuthValidator.verifyEmailVerificationCodeValidator,
  verifyEmailVerificationCode
);
router.post(
  "/login",
  upload.none(),
  nurseAuthValidator.loginNurseValidator,
  login
);
router.post(
  "/forgotPassword",
  upload.none(),
  nurseAuthValidator.forgotPasswordNurseValidator,
  forgotPassword
);
router.post(
  "/verifyResetCode",
  upload.none(),
  nurseAuthValidator.verifyResetCodeValidator,
  verifyResetCode
);
router.post(
  "/resetPassword",
  upload.none(),
  protectNurse,
  nurseAuthValidator.resetPasswordValidator,
  resetPassword
);
router.post("/logout", protectNurse, logout);

module.exports = router;
