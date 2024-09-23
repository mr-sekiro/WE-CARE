const express = require("express");

const {
  submitReport,
  nurseSubmitReport,
  getAllREports,
  getSpecificReport,
} = require("../services/reportService");
const authService = require("../services/authService");
const nurseAuthService = require("../services/nurseAuthService");

const router = express.Router();

router
  .route("/")
  .get(authService.protect, authService.allowedTo("admin"), getAllREports)
  .post(authService.protect, authService.allowedTo("user"), submitReport);

router
  .route("/:id")
  .get(authService.protect, authService.allowedTo("admin"), getSpecificReport);

router.route("/nurse").post(nurseAuthService.protectNurse, nurseSubmitReport);

module.exports = router;
