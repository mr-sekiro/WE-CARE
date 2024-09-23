const express = require("express");
const multer = require("multer");

const upload = multer();

const reviewRoute = require("./reviewRoute");
const nurseValidator = require("../utils/validators/nursesValidators");
const {
  createNurse,
  getNurses,
  getNurse,
  updateNurse,
  activateNurse,
  deactivateNurse,
  deleteNurse,
  changeNursePassword,
  uploadNursePhotos,
  resizePhotos,
  cloudinaryUploader,
  getLoggedNurseData,
  updateLoggedNursePassword,
  updateLoggedNurseData,
  changeStatus,
  getLoggedNurseNotifications,
  setDeviceToken,
} = require("../services/nurseService");
const authService = require("../services/authService");
const nurseAuthService = require("../services/nurseAuthService");

const router = express.Router();

//logged nurse
router.get(
  "/allForNurse",
  upload.none(),
  nurseAuthService.protectNurse,
  getNurses
);
router.get(
  "/specificForNurse/:id",
  upload.none(),
  nurseAuthService.protectNurse,
  nurseValidator.getNurseValidator,
  getNurse
);

router.get(
  "/getMe",
  upload.none(),
  nurseAuthService.protectNurse,
  getLoggedNurseData,
  getNurse
);
router.post(
  "/changeMyPassword",
  upload.none(),
  nurseAuthService.protectNurse,
  nurseValidator.changeMyPasswordValidator,
  updateLoggedNursePassword
);
router.post(
  "/updateMyData",
  upload.none(),
  nurseAuthService.protectNurse,
  uploadNursePhotos,
  resizePhotos,
  nurseValidator.updateMyDataValidator,
  cloudinaryUploader,
  updateLoggedNurseData
);
router.post(
  "/changeStatus",
  upload.none(),
  nurseAuthService.protectNurse,
  changeStatus
);
router.get(
  "/getMyNotification",
  upload.none(),
  nurseAuthService.protectNurse,
  getLoggedNurseNotifications
);
router.post(
  "/setDeviceToken",
  upload.none(),
  nurseAuthService.protectNurse,
  setDeviceToken
);
//admin
router
  .route("/")
  .get(upload.none(), authService.protect, getNurses)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    uploadNursePhotos,
    resizePhotos,
    nurseValidator.createNurseValidator,
    cloudinaryUploader,
    createNurse
  );

router
  .route("/:id")
  .get(
    upload.none(),
    authService.protect,
    nurseValidator.getNurseValidator,
    getNurse
  )
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    uploadNursePhotos,
    resizePhotos,
    nurseValidator.updateNurseValidator,
    cloudinaryUploader,
    updateNurse
  )
  .delete(
    upload.none(),
    authService.protect,
    authService.allowedTo("admin"),
    nurseValidator.deleteNurseValidator,
    deleteNurse
  );

router.post(
  "/changePassword/:id",
  upload.none(),
  authService.protect,
  authService.allowedTo("admin"),
  nurseValidator.changeNursePasswordValidator,
  changeNursePassword
);
router.post(
  "/activate/:id",
  upload.none(),
  authService.protect,
  authService.allowedTo("admin"),
  nurseValidator.activeNurseValidator,
  activateNurse
);
router.post(
  "/deactivate/:id",
  upload.none(),
  authService.protect,
  authService.allowedTo("admin"),
  nurseValidator.activeNurseValidator,
  deactivateNurse
);
router.use("/:nurseId/reviews", upload.none(), reviewRoute);
module.exports = router;
