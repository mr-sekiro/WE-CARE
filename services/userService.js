//crud operations
// const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
// const { uploadSinglePhoto } = require("../middlewares/uploadPhotoMiddleware");
// const cloudinary = require("../utils/cloudinary");
const { deleteImageByUrl } = require("../utils/deleteFromCloadinary");
const createToken = require("../utils/createToken");
const { sanitizeUser, sanitizeUsersList } = require("../utils/sanitizeData");
const UserModel = require("../models/userModel");

////////////////////////image uploading , processing/////////////////////////////
// exports.uploadUserPhoto = uploadSinglePhoto("photo");
// exports.resizePhoto = asyncHandler(async (req, res, next) => {
//   if (req.file) {
//     // Resize the image and save the modified buffer
//     req.file.buffer = await sharp(req.file.buffer)
//       .resize(100, 100)
//       .toFormat("jpeg")
//       .jpeg({ quality: 90 })
//       .toBuffer();
//   }

//   next();
// });
// exports.cloudinaryUploader = asyncHandler(async (req, res, next) => {
//   try {
//     if (req.file) {
//       // Convert the file buffer to a base64-encoded string
//       const base64String = req.file.buffer.toString("base64");
//       // Upload the base64-encoded string to Cloudinary
//       const result = await cloudinary.uploader.upload(
//         `data:${req.file.mimetype};base64,${base64String}`,
//         {
//           folder: "users", // Specify the folder where you want to upload the file
//         }
//       );
//       // Save the photo URL in the request body
//       req.body.photo = result.secure_url;
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

//@desc     Get all users or Get all users of specific governorate
//@route    GET /api/v1/users
//@access   private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  //*Build query*
  const countDocuments = await UserModel.countDocuments();
  const apiFeatures = new ApiFeatures(UserModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .search("UserModel")
    .limitFields()
    .sort()
    .populate("UserModel");

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const users = await mongooseQuery;
  res.status(200).json({
    results: users.length,
    paginationResult,
    data: sanitizeUsersList(users),
  });
});

//@desc     Get specific user by id
//@route    GET /api/v1/users/:id
//@access   private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findById(id)
    .populate({ path: "city", select: "name -_id" })
    .populate({ path: "governorate", select: "name -_id" });
  // .populate({ path: "city", select: "name -_id", populate: { path: "governorate", select: "name -_id " } });
  if (!user) {
    return next(new ApiError(`no user for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeUser(user) });
});

//@desc     Cerate user
//@route    POST /api/v1/user
//@access   Private/Admin
exports.createUser = asyncHandler(async (req, res) => {
  const user = await UserModel.create({
    name: req.body.name,
    slug: req.body.slug,
    gender: req.body.gender,
    dateOfBirth: req.body.dateOfBirth,
    age: req.body.age,
    //phone: req.body.phone,
    email: req.body.email,
    //photo: req.body.photo,
    governorate: req.body.governorate,
    city: req.body.city,
    password: req.body.password,
    role: "admin",
  });
  res.status(201).json({ data: sanitizeUser(user) });
});

//@desc     Update specific user
//@route    POST /api/v1/users/:id
//@access   Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) {
    return next(new ApiError(`No user found for this ID: ${id}`, 404));
  }
  //delete the old photo if a new one added
  if (req.body.photo && user.photo) {
    await deleteImageByUrl(user.photo);
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: id },
    {
      name: req.body.name,
      slug: req.body.slug,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      //phone: req.body.phone,
      email: req.body.email,
      //photo: req.body.photo,
      governorate: req.body.governorate,
      city: req.body.city,
      active: req.body.active,
      role: req.body.role,
      bloodType: req.body.bloodType,
      weight: req.body.weight,
      hight: req.body.hight,
    },
    {
      new: true,
    }
  );
  updatedUser.save();
  res.status(200).json({ data: sanitizeUser(updatedUser) });
});

//@desc     Delete specific user
//@route    DELETE /api/v1/users/:id
//@access   Private/Admin
exports.changeUserPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findOneAndUpdate(
    { _id: id },
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );
  if (!user) {
    return next(new ApiError(`No user found for this ID: ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeUser(user) });
});

//@desc     Delete specific user
//@route    DELETE /api/v1/users/:id
//@access   Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) {
    return next(new ApiError(`no user for this id ${id}`, 404));
  }
  if (user.photo) {
    await deleteImageByUrl(user.photo);
  }
  // Delete user from the database
  await UserModel.findByIdAndDelete(id);
  res.status(204).send();
});

/////////////////////////////////////////////////////////////////////
/////////////////////// LOGGED USER /////////////////////////////////
/////////////////////////////////////////////////////////////////////

//@desc     Get logged user data
//@route    GET /api/v1/users/getMe
//@access   private/protect
exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

//@desc     Update logged user password
//@route    POST /api/v1/users/changeMyPassword
//@access   private/protect
exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
  //update user password
  const user = await UserModel.findOneAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );
  //Generate token
  const token = createToken(user._id);
  res.status(200).json({ status: "success", token });
});

//@desc     Update logged user data (with password, role)
//@route    POST /api/v1/users/updateMyData
//@access   private/protect
exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  //delete the old photo if a new one added
  if (req.body.photo && user.photo) {
    await deleteImageByUrl(user.photo);
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: req.user._id },
    {
      name: req.body.name,
      slug: req.body.slug,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      //phone: req.body.phone,
      email: req.body.email,
      //photo: req.body.photo,
      governorate: req.body.governorate,
      city: req.body.city,
      bloodType: req.body.bloodType,
      weight: req.body.weight,
      hight: req.body.hight,
    },
    {
      new: true,
    }
  );
  updatedUser.save();
  res.status(200).json({ status: "success" });
});

//@desc     deactivate logged user
//@route    POST /api/v1/users/deactiveMe
//@access   private/protect
exports.deactivateLoggedUser = asyncHandler(async (req, res, next) => {
  await UserModel.findOneAndUpdate(req.user._id, {
    active: false,
  });
  res.status(200).json({ satatus: "success" });
});
//@desc     activate logged user
//@route    POST /api/v1/users/activeMe
//@access   private/protect
exports.activateLoggedUser = asyncHandler(async (req, res, next) => {
  await UserModel.findOneAndUpdate(req.user._id, {
    active: true,
  });
  res.status(200).json({ satatus: "success" });
});

//@desc     Get logged user notifications
//@route    GET /api/v1/users/getMyNotification
//@access   private/protect
exports.getLoggedUserNotifications = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id).populate({
    path: "notifications",
  });

  res.status(200).json({
    status: "success",
    results: user.notifications.length,
    data: user.notifications,
  });
});

//@desc     SET logged user device token
//@route    GET /api/v1/users/setDeviceToken
//@access   private/protect
exports.setDeviceToken = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findByIdAndUpdate(req.user._id, {
    deviceId: req.body.deviceToken,
  });
  res.status(200).json({
    status: "success",
    userToken: user.deviceId,
  });
});
