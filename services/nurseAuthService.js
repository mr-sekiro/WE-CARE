// Signup, Login, Forget password, Reset password
const crypto = require("crypto");
const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const {
  uploadMultiplePhotos,
} = require("../middlewares/uploadPhotoMiddleware");
const cloudinary = require("../utils/cloudinary");
const createToken = require("../utils/createToken");
const { sanitizeNurse } = require("../utils/sanitizeData");
const NurseModel = require("../models/nurseModel");
const BlackListTokenModel = require("../models/blackListTokenModel");

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

//@desc     Signup(nurse)
//@route    POST /api/v1/nurseAuth/signup
//@access   puplic
exports.signup = asyncHandler(async (req, res, next) => {
  //create nurse
  const nurse = await NurseModel.create({
    name: req.body.name,
    slug: req.body.slug,
    gender: req.body.gender,
    dateOfBirth: req.body.dateOfBirth,
    age: req.body.age,
    phone: req.body.phone,
    email: req.body.email,
    photo: req.body.photo,
    idCardFront: req.body.idCardFront,
    idCardBack: req.body.idCardBack,
    certificate: req.body.certificate,
    governorate: req.body.governorate,
    city: req.body.city,
    password: req.body.password,
    stripeAccountId: req.body.stripeAccountId,
    specialization: req.body.specialization,
    about: req.body.about,
    yearsOfExperience: req.body.yearsOfExperience,
  });

  //generate token
  const token = createToken(nurse._id);
  const Nurse = sanitizeNurse(nurse);
  //send response
  res.status(201).json({ Nurse, token });
});

//@desc     email verification(nurse)
//@route    POST /api/v1/nurseAuth/emailVerification
//@access   puplic
exports.emailVerification = asyncHandler(async (req, res, next) => {
  //get nurse by email
  const nurse = await NurseModel.findById(req.nurse._id);
  if (!nurse) {
    return next(new ApiError("There is no nurse for this email", 401));
  }
  //Generate hash random 6 digits and save it in DB
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const hashedVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");
  //save hashed resetCode
  nurse.verificationCode = hashedVerificationCode;
  //add expiration resetCode (10m)
  nurse.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
  nurse.verificationCodeVerified = false;

  await nurse.save();
  //sent the code via email
  const message = `hi ${nurse.name},\n we recevied a request to verify the email on your WE CARE account. \n ${verificationCode} \n Enter this code to complete the process \n`;
  const mailOptions = {
    from: {
      name: "WE CARE",
      address: process.env.EMAIL_USER,
    },
    to: nurse.email,
    subject: "Your verification code (Valid for 10 min)",
    text: message,
  };
  //send email
  try {
    await sendEmail({
      email: nurse.email,
      mailOptions,
    });
  } catch (err) {
    nurse.verificationCode = undefined;
    nurse.verificationCodeExpires = undefined;
    nurse.verificationCodeVerified = undefined;

    await nurse.save();
    return next(new ApiError("there is an error in sending email", 500));
  }
  res.status(200).json({
    status: "success",
    message: "verification code sent to your email. ",
  });
});

//@desc     verfiy emailVerification code(nurse)
//@route    POST /api/v1/nurseAuth/verifyEmailVerificationCode
//@access   protected/nurse
exports.verifyEmailVerificationCode = asyncHandler(async (req, res, next) => {
  //get nurse based on reset code
  const hashedVerificationCode = crypto
    .createHash("sha256")
    .update(req.body.verificationCode)
    .digest("hex");

  const nurse = await NurseModel.findOne({
    verificationCode: hashedVerificationCode,
    verificationCodeExpires: { $gt: Date.now() },
  });

  // Check if nurse exists
  if (!nurse) {
    return next(new ApiError("verification code invalid or expired"));
  }

  // Update nurse and save
  nurse.verificationCode = undefined;
  nurse.verificationCodeExpires = undefined;
  nurse.verificationCodeVerified = true;
  nurse.active = true;
  await nurse.save();

  res.status(200).json({
    status: "success",
  });
});
//@desc     login(nurse)
//@route    POST /api/v1/nurseAuth/login
//@access   puplic
exports.login = asyncHandler(async (req, res, next) => {
  //check if nurse exist & check if password is correct
  const nurse = await NurseModel.findOne({ email: req.body.email });
  if (!nurse || !(await bcrypt.compare(req.body.password, nurse.password))) {
    return next(new ApiError("Incorrect email or password"));
  }
  if (!nurse.active) {
    return next(new ApiError("this account is not active"));
  }
  nurse.deviceId = req.body.deviceId;
  nurse.save();
  //generate token
  const token = createToken(nurse._id);
  const Nurse = sanitizeNurse(nurse);
  //send response
  res.status(201).json({ Nurse, token });
});
//@desc     forget password(nurse)
//@route    POST /api/v1/nurseAuth/forgotPassword
//@access   puplic
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  //get nurse by email
  const nurse = await NurseModel.findOne({ email: req.body.email });
  if (!nurse) {
    return next(
      new ApiError(`No nurse found for this email : ${req.body.email}`, 404)
    );
  }
  //if nurse exist => Generate hash random 6 digits and save it in DB
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  //=>save hashed resetCode
  nurse.resetCode = hashedResetCode;
  //=>add expiration resetCode (10m)
  nurse.resetCodeExpires = Date.now() + 10 * 60 * 1000;
  nurse.resetCodeVerified = false;

  await nurse.save();
  //sent the code via email
  const message = `hi ${nurse.name},\n we recevied a request to reset the password on your WE CARE account. \n ${resetCode} \n Enter this code to complete the process \n`;
  const mailOptions = {
    from: {
      name: "WE CARE",
      address: process.env.EMAIL_USER,
    },
    to: nurse.email,
    subject: "Your password reset code (Valid for 10 min)",
    text: message,
  };
  //send email
  try {
    await sendEmail({
      email: nurse.email,
      mailOptions,
    });
  } catch (err) {
    nurse.resetCode = undefined;
    nurse.resetCodeExpires = undefined;
    nurse.resetCodeVerified = undefined;

    await nurse.save();
    return next(new ApiError("there is an error in sending email", 500));
  }
  res
    .status(200)
    .json({ status: "success", message: "resset code sent to your email. " });
});

//@desc     verfiy Reset code(nurse)
//@route    POST /api/v1/nurseAuth/verifyResetCode
//@access   puplic
exports.verifyResetCode = asyncHandler(async (req, res, next) => {
  //get nurse based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  const nurse = await NurseModel.findOne({
    resetCode: hashedResetCode,
    resetCodeExpires: { $gt: Date.now() },
  });

  // Check if nurse exists
  if (!nurse) {
    return next(new ApiError("Reset code invalid or expired"));
  }

  // Update nurse and save
  nurse.resetCodeVerified = true;
  await nurse.save();
  //generate token
  const token = createToken(nurse._id);
  //send response
  res.status(201).json({ status: "success", token });
});

//@desc     Reset Password(nurse)
//@route    POST /api/v1/nurseAuth/resetPassword
//@access   Protect/nurse
exports.resetPassword = asyncHandler(async (req, res, next) => {
  //get nurse based by id
  const nurse = await NurseModel.findById(req.nurse._id);

  if (!nurse.resetCodeVerified) {
    return next(new ApiError("Reset code not verified"));
  }
  // Update nurse and save
  nurse.password = req.body.newPassword;
  nurse.resetCode = undefined;
  nurse.resetCodeExpires = undefined;
  nurse.resetCodeVerified = undefined;

  await nurse.save();
  //Generate token
  const token = createToken(nurse._id);
  res.status(200).json({
    status: "success",
    token,
  });
});
//@desc     logout
//@route    POST /api/v1/nurseAuth/logout
//@access   Protect/nurse
exports.logout = asyncHandler(async (req, res, next) => {
  // 1. Get the token from the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new ApiError("No token provided", 400));
  }
  // 2. Verify the token to ensure it's valid before blacklisting
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    // 3. Check if nurse exists
    const currentNurse = await NurseModel.findById(decoded.userId);
    if (!currentNurse) {
      return next(new ApiError("There is no nurse for this token", 401));
    }
    // 4. Add the token to the blacklist
    const newBlackListedToken = new BlackListTokenModel({ token });
    await newBlackListedToken.save();
    // 5. Respond with a success message
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    return next(new ApiError("Invalid token", 401));
  }
});

///////////////////////////////////////////////////////
// @desc     Protect nurses
// @route    Middleware
// @access   private/protect
exports.protectNurse = asyncHandler(async (req, res, next) => {
  // 1.check if token exists and get it
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError("You are not logged in, please log in to get access", 401)
    );
  }
  // 2. Check if the token is blacklisted
  const blacklistedToken = await BlackListTokenModel.findOne({ token });
  if (blacklistedToken) {
    return next(new ApiError("Invalid Token", 401));
  }
  // 3.verify token [no change happens, expired token]
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  // 4.check if nurse exists
  const currentNurse = await NurseModel.findById(decoded.userId);
  if (!currentNurse) {
    return next(new ApiError("There is no nurse for this token", 401));
  }

  // 5. check if nurse changed his password after token creation
  if (currentNurse.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(
      currentNurse.passwordChangedAt.getTime() / 1000,
      10
    );
    // password changed after token creation
    if (passwordChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "Nurse changed his password recently, please log in again",
          401
        )
      );
    }
  }

  req.nurse = currentNurse;
  next();
});
