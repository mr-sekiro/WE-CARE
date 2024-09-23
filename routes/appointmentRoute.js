const express = require("express");

const {
  createCheckoutSession,
  getAllAppointments,
  getSpecificAppointment,
  deleteAppointment,
  userCancelAppointment,
  cancelWithTax,
  userConfirmAppointment,
  getLoggedUserCurrentAppointments,
  getLoggedUserCompletedAppointments,
  getLoggedUserRejectedAppointments,
  getLoggedUserCancelledAppointments,
  nurseAcceptAppointment,
  nurseRejectAppointment,
  nurseCancelAppointment,
  getLoggedNurseRequests,
  getLoggedNurseCurrentAppointments,
  getLoggedNurseCompletedAppointments,
  getLoggedNurseCancelledAppointments,
} = require("../services/appointmentService");
const authService = require("../services/authService");
const nurseAuthService = require("../services/nurseAuthService");

const router = express.Router();
router.post(
  "/checkout-session",
  authService.protect,
  authService.allowedTo("user"),
  createCheckoutSession
);
//User//
router
  .route("/")
  .get(authService.protect, authService.allowedTo("admin"), getAllAppointments);
router
  .route("/:id")
  .get(
    authService.protect,
    authService.allowedTo("admin"),
    getSpecificAppointment
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin"),
    deleteAppointment
  );
router
  .route("/userConfirmation/:id")
  .post(
    authService.protect,
    authService.allowedTo("user"),
    userConfirmAppointment
  );
router
  .route("/userCancellation/:id")
  .delete(
    authService.protect,
    authService.allowedTo("user"),
    userCancelAppointment
  );
router
  .route("/userCancellationWithTax/:id")
  .delete(authService.protect, authService.allowedTo("user"), cancelWithTax);
router
  .route("/user/getCurrentAppointments")
  .get(
    authService.protect,
    authService.allowedTo("user"),
    getLoggedUserCurrentAppointments
  );
router
  .route("/user/getCompleteAppointments")
  .get(
    authService.protect,
    authService.allowedTo("user"),
    getLoggedUserCompletedAppointments
  );
router
  .route("/user/getRejectedAppointments")
  .get(
    authService.protect,
    authService.allowedTo("user"),
    getLoggedUserRejectedAppointments
  );
router
  .route("/user/getCancelledAppointments")
  .get(
    authService.protect,
    authService.allowedTo("user"),
    getLoggedUserCancelledAppointments
  );
//nurse//
router
  .route("/nurseAcceptance/:id")
  .post(nurseAuthService.protectNurse, nurseAcceptAppointment);

router
  .route("/nurseRejection/:id")
  .post(nurseAuthService.protectNurse, nurseRejectAppointment);

router
  .route("/nurseCancellation/:id")
  .delete(nurseAuthService.protectNurse, nurseCancelAppointment);

router
  .route("/nurse/getRequests")
  .get(nurseAuthService.protectNurse, getLoggedNurseRequests);
router
  .route("/nurse/getCurrentAppointments")
  .get(nurseAuthService.protectNurse, getLoggedNurseCurrentAppointments);
router
  .route("/nurse/getCompleteAppointments")
  .get(nurseAuthService.protectNurse, getLoggedNurseCompletedAppointments);
router
  .route("/nurse/getCancelledAppointments")
  .get(nurseAuthService.protectNurse, getLoggedNurseCancelledAppointments);
module.exports = router;
