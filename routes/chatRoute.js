const express = require("express");

const authService = require("../services/authService");
const nurseAuthService = require("../services/nurseAuthService");
const {
  userSendMessage,
  nurseSendMessage,
  getLoggedUserChats,
  getLoggedNurseChats,
  getSpecificChat,
  getSpecificChatByAppointment,
} = require("../services/chatService");

const router = express.Router();

router.route("/userSendMessage").post(authService.protect, userSendMessage);
router
  .route("/nurseSendMessage")
  .post(nurseAuthService.protectNurse, nurseSendMessage);
router.route("/user/getMyChats").get(authService.protect, getLoggedUserChats);
router
  .route("/nurse/getMyChats")
  .get(nurseAuthService.protectNurse, getLoggedNurseChats);
router.route("/user/getChat/:id").get(authService.protect, getSpecificChat);
router
  .route("/nurse/getChat/:id")
  .get(nurseAuthService.protectNurse, getSpecificChat);
router
  .route("/user/getChatByAppointment/:id")
  .get(authService.protect, getSpecificChatByAppointment);
router
  .route("/nurse/getChatByAppointment/:id")
  .get(nurseAuthService.protectNurse, getSpecificChatByAppointment);
module.exports = router;
