const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const {
  uploadMultiplePhotos,
} = require("../middlewares/uploadPhotoMiddleware");
const cloudinary = require("../utils/cloudinary");
const { deleteImageByUrl } = require("../utils/deleteFromCloadinary");
const createToken = require("../utils/createToken");
const {
  sanitizeNurse,
  sanitizeNursesList,
  sanitizeNurseForAdmin,
} = require("../utils/sanitizeData");
const NurseModel = require("../models/nurseModel");
const UserModel = require("../models/userModel");

////////////////////////image uploading , processing/////////////////////////////
exports.uploadNursePhotos = uploadMultiplePhotos([
  { name: "photo", maxCount: 1 },
  { name: "idCardFront", maxCount: 1 },
  { name: "idCardBack", maxCount: 1 },
  { name: "certificate", maxCount: 1 },
]);

exports.resizePhotos = asyncHandler(async (req, res, next) => {
  if (req.files) {
    const resizeAndConvert = async (file) =>
      await sharp(file.buffer)
        .resize(100, 100)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer();

    if (req.files.photo) {
      req.files.photo[0].buffer = await resizeAndConvert(req.files.photo[0]);
    }
    // if (req.files.idCardFront) {
    //   req.files.idCardFront[0].buffer = await resizeAndConvert(req.files.idCardFront[0]);
    // }
    // if (req.files.idCardBack) {
    //   req.files.idCardBack[0].buffer = await resizeAndConvert(req.files.idCardBack[0]);
    // }
    // if (req.files.certificate) {
    //   req.files.certificate[0].buffer = await resizeAndConvert(req.files.certificate[0]);
    // }
  }
  next();
});

exports.cloudinaryUploader = asyncHandler(async (req, res, next) => {
  try {
    const uploadToCloudinary = async (file, folder) => {
      const base64String = file.buffer.toString("base64");
      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${base64String}`,
        { folder }
      );
      return result.secure_url;
    };

    if (req.files.photo) {
      req.body.photo = await uploadToCloudinary(req.files.photo[0], "nurses");
    }
    if (req.files.idCardFront) {
      req.body.idCardFront = await uploadToCloudinary(
        req.files.idCardFront[0],
        "front_id_card"
      );
    }
    if (req.files.idCardBack) {
      req.body.idCardBack = await uploadToCloudinary(
        req.files.idCardBack[0],
        "back_id_card"
      );
    }
    if (req.files.certificate) {
      req.body.certificate = await uploadToCloudinary(
        req.files.certificate[0],
        "certificates"
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

// @desc     Get all nurses or Get all nurses of specific governorate and city
// @route    GET /api/v1/nurses
// @access   Public
exports.getNurses = asyncHandler(async (req, res) => {
  const countDocuments = await NurseModel.countDocuments();
  const apiFeatures = new ApiFeatures(NurseModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .search("NurseModel")
    .limitFields()
    .sort()
    .populate("NurseModel");

  const { mongooseQuery, paginationResult } = apiFeatures;
  const nurses = await mongooseQuery;

  // Retrieve the logged-in user's favorites
  let userFavorites = [];
  if (req.user) {
    const user = await UserModel.findById(req.user._id).select("favorites");
    userFavorites = user.favorites.map((favorite) => favorite.toString());
  }

  // Add isFavorite field to each nurse
  const nursesWithFavorites = nurses.map((nurse) => {
    const isFavorite = userFavorites.includes(nurse._id.toString());
    return {
      ...nurse.toObject(),
      isFavorite,
    };
  });

  res.status(200).json({
    results: nurses.length,
    paginationResult,
    data: sanitizeNursesList(nursesWithFavorites),
  });
});

//@desc     Get specific nurse by id
//@route    GET /api/v1/nurses/:id
//@access   Public
exports.getNurse = asyncHandler(async (req, res, next) => {
  if (req.user) {
    if (req.user.role === "user") {
      const { id } = req.params;
      const nurse = await NurseModel.findById(id)
        .populate({ path: "city", select: "name -_id" })
        .populate({ path: "governorate", select: "name -_id" })
        .populate({
          path: "reviews",
          populate: {
            path: "user",
            select: "name photo -_id",
          },
        });
      if (!nurse) {
        return next(new ApiError(`no nurse for this id ${id}`, 404));
      }
      res.status(200).json({ data: sanitizeNurse(nurse) });
    }

    if (req.user.role === "admin") {
      const { id } = req.params;
      const nurse = await NurseModel.findById(id)
        .populate({ path: "city", select: "name -_id" })
        .populate({ path: "governorate", select: "name -_id" })
        .populate({
          path: "reviews",
          populate: {
            path: "user",
            select: "name photo -_id",
          },
        });
      if (!nurse) {
        return next(new ApiError(`no nurse for this id ${id}`, 404));
      }
      res.status(200).json({ data: sanitizeNurseForAdmin(nurse) });
    }
  }
  if (req.nurse) {
    const { id } = req.params;
    const nurse = await NurseModel.findById(id)
      .populate({ path: "city", select: "name -_id" })
      .populate({ path: "governorate", select: "name -_id" })
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name photo -_id",
        },
      });
    if (!nurse) {
      return next(new ApiError(`no nurse for this id ${id}`, 404));
    }
    res.status(200).json({ data: sanitizeNurse(nurse) });
  }
});

//@desc     Cerate nurse
//@route    POST /api/v1/nurses
//@access   Private
exports.createNurse = asyncHandler(async (req, res) => {
  const nurse = await NurseModel.create(req.body);
  res.status(201).json({ data: sanitizeNurse(nurse) });
});

//@desc     Update specific nurse
//@route    POST /api/v1/nurses/:id
//@access   Private
exports.updateNurse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const nurse = await NurseModel.findById(id);
  if (!nurse) {
    return next(new ApiError(`No nurse found for this ID: ${id}`, 404));
  }
  //delete the old photo if a new one added
  if (req.body.photo) {
    await deleteImageByUrl(nurse.photo);
  }

  const updatedNurse = await NurseModel.findOneAndUpdate(
    { _id: id },
    {
      name: req.body.name,
      slug: req.body.slug,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      phone: req.body.phone,
      email: req.body.email,
      photo: req.body.photo,
      governorate: req.body.governorate,
      city: req.body.city,
      specialization: req.body.specialization,
      about: req.body.about,
      yearsOfExperience: req.body.yearsOfExperience,
    },
    {
      new: true,
    }
  );
  updatedNurse.save();
  res.status(200).json({ data: sanitizeNurse(updatedNurse) });
});

//@desc     change password of specific nurse
//@route    POST /api/v1//changePassword/:id
//@access   Private
exports.changeNursePassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const nurse = await NurseModel.findOneAndUpdate(
    { _id: id },
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );
  if (!nurse) {
    return next(new ApiError(`No user found for this ID: ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeNurse(nurse) });
});

//@desc     Delete specific nurse
//@route    DELETE /api/v1/nurses/:id
//@access   Private
exports.deleteNurse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const nurse = await NurseModel.findById(id);
  if (!nurse) {
    return next(new ApiError(`No nurse found for this ID: ${id}`, 404));
  }
  // Extract image URLs from nurse object
  const imageUrls = [
    nurse.photo,
    nurse.idCardFront,
    nurse.idCardBack,
    nurse.certificate,
  ];
  // Delete all images associated with the nurse
  imageUrls.forEach((imageUrl) => {
    deleteImageByUrl(imageUrl);
  });
  // Delete nurse from the database
  await NurseModel.findByIdAndDelete(id);
  await NurseModel.calcNursesQuantity(nurse.city);
  res.status(204).send();
});

//@desc     deactivate specific Nurse
//@route    POST /api/v1/users/deactive/:id
//@access   private/protect
exports.deactivateNurse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await NurseModel.findByIdAndUpdate(id, {
    active: false,
  });
  res.status(200).json({ satatus: "success" });
});
//@desc     activate specific Nurse
//@route    POST /api/v1/nurses/active/:id
//@access   private/protect
exports.activateNurse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await NurseModel.findByIdAndUpdate(id, {
    active: true,
  });
  res.status(200).json({ satatus: "success" });
});

/////////////////////////////////////////////////////////////////////
/////////////////////// LOGGED NURSE ////////////////////////////////
/////////////////////////////////////////////////////////////////////

//@desc     Get logged nurse data
//@route    GET /api/v1/nurses/getMe
//@access   private/protect
exports.getLoggedNurseData = asyncHandler(async (req, res, next) => {
  req.params.id = req.nurse._id;
  next();
});

//@desc     Update logged nurse password
//@route    POST /api/v1/nurses/changeMyPassword
//@access   private/protect
exports.updateLoggedNursePassword = asyncHandler(async (req, res, next) => {
  //update user password
  const nurse = await NurseModel.findOneAndUpdate(
    req.nurse._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );
  //Generate token
  const token = createToken(nurse._id);
  res.status(200).json({ status: "success", token });
});

//@desc     Update logged nurse data (with password, role)
//@route    POST /api/v1/nurses/updateMyData
//@access   private/protect
exports.updateLoggedNurseData = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findById(req.nurse._id);
  //delete the old photo if a new one added
  if (req.body.photo) {
    await deleteImageByUrl(nurse.photo);
  }

  const updatedNurse = await NurseModel.findOneAndUpdate(
    { _id: req.nurse._id },
    {
      name: req.body.name,
      slug: req.body.slug,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      phone: req.body.phone,
      email: req.body.email,
      photo: req.body.photo,
      governorate: req.body.governorate,
      city: req.body.city,
      specialization: req.body.specialization,
      about: req.body.about,
      yearsOfExperience: req.body.yearsOfExperience,
    },
    {
      new: true,
    }
  );
  updatedNurse.save();
  res.status(200).json({ status: "success" });
});

//@desc     Make nurse status available/unavailable
//@route    POST /api/v1/nurses/changeStatus
//@access   private/protect
exports.changeStatus = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findById(req.nurse._id);
  if (nurse.available) {
    nurse.available = false;
    nurse.save();
  } else {
    nurse.available = true;
    nurse.save();
  }
  res.status(200).json({ message: "success" });
});
//@desc     Get logged nurse notifications
//@route    GET /api/v1/nurses/getMyNotification
//@access   private/protect
exports.getLoggedNurseNotifications = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findById(req.nurse._id).populate({
    path: "notifications",
  });

  res.status(200).json({
    status: "success",
    results: nurse.notifications.length,
    data: nurse.notifications,
  });
});
//@desc     SET logged nurse device token
//@route    POST /api/v1/nurses/setDeviceToken
//@access   private/protect
exports.setDeviceToken = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findByIdAndUpdate(req.nurse._id, {
    deviceId: req.body.deviceToken,
  });
  res.status(200).json({
    status: "success",
    userToken: nurse.deviceId,
  });
});
