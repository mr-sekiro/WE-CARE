const express = require("express");

const userValidator = require("../utils/validators/usersValidators");
const {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  //uploadUserPhoto,
  //resizePhoto,
  //cloudinaryUploader,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  getLoggedUserNotifications,
  setDeviceToken,
} = require("../services/userService");
const authService = require("../services/authService");

const router = express.Router();
//logged user
router.get("/getMe", authService.protect, getLoggedUserData, getUser);
router.post(
  "/changeMyPassword",
  authService.protect,
  userValidator.changeMyPasswordValidator,
  updateLoggedUserPassword
);
router.post(
  "/updateMyData",
  authService.protect,
  //uploadUserPhoto,
  //resizePhoto,
  userValidator.updateMyDataValidator,
  //cloudinaryUploader,
  updateLoggedUserData
);
router.get(
  "/getMyNotification",
  authService.protect,
  getLoggedUserNotifications
);
router.post("/setDeviceToken", authService.protect, setDeviceToken);

//admin
router
  .route("/")
  .get(authService.protect, authService.allowedTo("admin"), getUsers)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    //uploadUserPhoto,
    //resizePhoto,
    //cloudinaryUploader,
    userValidator.createUserValidator,
    createUser
  );

router
  .route("/:id")
  .get(
    authService.protect,
    authService.allowedTo("admin"),
    userValidator.getUserValidator,
    getUser
  )
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    //uploadUserPhoto,
    //resizePhoto,
    //cloudinaryUploader,
    userValidator.updateUserValidator,
    updateUser
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin"),
    userValidator.deleteUserValidator,
    deleteUser
  );

router.post(
  "/changePassword/:id",
  authService.protect,
  authService.allowedTo("admin"),
  userValidator.changeUserPasswordValidator,
  changeUserPassword
);
module.exports = router;
