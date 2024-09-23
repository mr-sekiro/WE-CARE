// Signup, Login, Forget password, Reset password
const crypto = require("crypto");
const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const { uploadSinglePhoto } = require("../middlewares/uploadPhotoMiddleware");
const cloudinary = require("../utils/cloudinary");
const createToken = require("../utils/createToken");
const { sanitizeUser } = require("../utils/sanitizeData");
const UserModel = require("../models/userModel");
const BlackListTokenModel = require("../models/blackListTokenModel");

////////////////////////image uploading , processing/////////////////////////////
exports.uploadUserPhoto = uploadSinglePhoto("photo");
exports.resizePhoto = asyncHandler(async (req, res, next) => {
  if (req.file) {
    // Resize the image and save the modified buffer
    req.file.buffer = await sharp(req.file.buffer)
      .resize(100, 100)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  next();
});
exports.cloudinaryUploader = asyncHandler(async (req, res, next) => {
  try {
    if (req.file) {
      // Convert the file buffer to a base64-encoded string
      const base64String = req.file.buffer.toString("base64");
      // Upload the base64-encoded string to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${base64String}`,
        {
          folder: "users", // Specify the folder where you want to upload the file
        }
      );
      // Save the photo URL in the request body
      req.body.photo = result.secure_url;
    }
    next();
  } catch (error) {
    next(error);
  }
});

//@desc     Signup
//@route    POST /api/v1/auth/signup
//@access   public
exports.signup = asyncHandler(async (req, res, next) => {
  // Load the appropriate image based on the first letter of the user's name
  const firstLetter = req.body.name.charAt(0).toUpperCase();
  let imagePath = path.join(__dirname, "..", "images", `${firstLetter}.jfif`);

  // Check if the image for the first letter exists
  if (!fs.existsSync(imagePath)) {
    // Use the default image if the first letter image does not exist
    imagePath = path.join(__dirname, "..", "images", "default.png");
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(100, 100)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64String = resizedImageBuffer.toString("base64");
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64String}`,
      {
        folder: "users",
      }
    );

    // Set the photo URL in the request body
    req.body.photo = result.secure_url;
  } catch (error) {
    return next(new ApiError("Error loading user image", 500));
  }

  // Create user
  const user = await UserModel.create({
    name: req.body.name,
    slug: req.body.slug,
    gender: req.body.gender,
    dateOfBirth: req.body.dateOfBirth,
    age: req.body.age,
    email: req.body.email,
    photo: req.body.photo,
    governorate: req.body.governorate,
    city: req.body.city,
    password: req.body.password,
    bloodType: req.body.bloodType,
    weight: req.body.weight,
    height: req.body.height,
  });

  // Generate token
  const token = createToken(user._id);
  const User = sanitizeUser(user);
  // Send response
  res.status(201).json({ User, token });
});
//@desc     email verification
//@route    POST /api/v1/auth/emailVerification
//@access   puplic
exports.emailVerification = asyncHandler(async (req, res, next) => {
  //get user by email
  const user = await UserModel.findById(req.user._id);
  if (!user) {
    return next(new ApiError("There is no user for this email", 401));
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
  user.verificationCode = hashedVerificationCode;
  //add expiration resetCode (10m)
  user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
  user.verificationCodeVerified = false;

  await user.save();
  //sent the code via email
  const message = `hi ${user.name},\n we recevied a request to verify the email on your WE CARE account. \n ${verificationCode} \n Enter this code to complete the process \n`;
  const mailOptions = {
    from: {
      name: "WE CARE",
      address: process.env.EMAIL_USER,
    },
    to: user.email,
    subject: "Your verification code (Valid for 10 min)",
    text: message,
  };
  //send email
  try {
    await sendEmail({
      email: user.email,
      mailOptions,
    });
  } catch (err) {
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.verificationCodeVerified = undefined;

    await user.save();
    return next(new ApiError("there is an error in sending email", 500));
  }
  res.status(200).json({
    status: "success",
    message: "verification code sent to your email. ",
  });
});
//@desc     verfiy emailVerification code
//@route    POST /api/v1/auth/verifyEmailVerificationCode
//@access   puplic
exports.verifyEmailVerificationCode = asyncHandler(async (req, res, next) => {
  //get user based on reset code
  const hashedVerificationCode = crypto
    .createHash("sha256")
    .update(req.body.verificationCode)
    .digest("hex");

  const user = await UserModel.findOne({
    verificationCode: hashedVerificationCode,
    verificationCodeExpires: { $gt: Date.now() },
  });

  // Check if user exists
  if (!user) {
    return next(new ApiError("verification code invalid or expired"));
  }

  // Update user and save
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  user.verificationCodeVerified = true;
  user.active = true;
  await user.save();

  res.status(200).json({
    status: "success",
  });
});
//@desc     login
//@route    POST /api/v1/auth/login
//@access   puplic
exports.login = asyncHandler(async (req, res, next) => {
  //check if user exist & check if password is correct
  const user = await UserModel.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password"));
  }
  user.deviceId = req.body.deviceId;
  user.save();
  //generate token
  const token = createToken(user._id);
  const User = sanitizeUser(user);
  //send response
  res.status(201).json({ User, token });
});
//@desc     forget password
//@route    POST /api/v1/auth/forgotPassword
//@access   puplic
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  //get user by email
  const user = await UserModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`No user found for this email : ${req.body.email}`, 404)
    );
  }
  //if user exist => Generate hash random 6 digits and save it in DB
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  //=>save hashed resetCode
  user.resetCode = hashedResetCode;
  //=>add expiration resetCode (10m)
  user.resetCodeExpires = Date.now() + 10 * 60 * 1000;
  user.resetCodeVerified = false;

  await user.save();
  //sent the code via email
  const message = `hi ${user.name},\n we recevied a request to reset the password on your WE CARE account. \n ${resetCode} \n Enter this code to complete the process \n`;
  const mailOptions = {
    from: {
      name: "WE CARE",
      address: process.env.EMAIL_USER,
    },
    to: user.email,
    subject: "Your password reset code (Valid for 10 min)",
    text: message,
  };
  //send email
  try {
    await sendEmail({
      email: user.email,
      mailOptions,
    });
  } catch (err) {
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    user.resetCodeVerified = undefined;

    await user.save();
    return next(new ApiError("there is an error in sending email", 500));
  }
  res
    .status(200)
    .json({ status: "success", message: "resset code sent to your email. " });
});

//@desc     verfiy Reset code
//@route    POST /api/v1/auth/verifyResetCode
//@access   puplic
exports.verifyResetCode = asyncHandler(async (req, res, next) => {
  //get user based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  const user = await UserModel.findOne({
    resetCode: hashedResetCode,
    resetCodeExpires: { $gt: Date.now() },
  });

  // Check if user exists
  if (!user) {
    return next(new ApiError("Reset code invalid or expired"));
  }

  // Update user and save
  user.resetCodeVerified = true;
  await user.save();
  //generate token
  const token = createToken(user._id);
  //send response
  res.status(201).json({ status: "success", token });
});

//@desc     Reset Password
//@route    POST /api/v1/auth/resetPassword
//@access   puplic
exports.resetPassword = asyncHandler(async (req, res, next) => {
  //get user based by id
  const user = await UserModel.findById(req.user._id);

  if (!user.resetCodeVerified) {
    return next(new ApiError("Reset code not verified"));
  }
  // Update user and save
  user.password = req.body.newPassword;
  user.resetCode = undefined;
  user.resetCodeExpires = undefined;
  user.resetCodeVerified = undefined;
  await user.save();
  //Generate token
  const token = createToken(user._id);
  res.status(200).json({
    status: "success",
    token,
  });
});

//@desc     logout
//@route    POST /api/v1/auth/logout
//@access   Protect/user
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
    // 3. Check if user exists
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      return next(new ApiError("There is no user for this token", 401));
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
exports.protect = asyncHandler(async (req, res, next) => {
  // 1. Check if token exists and get it
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

  // 3. Verify token [no change happens, expired token]
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 4. Check if user exists
  const currentUser = await UserModel.findById(decoded.userId);
  if (!currentUser) {
    return next(new ApiError("There is no user for this token", 401));
  }

  // 5. Check if user changed their password after token creation
  if (currentUser.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token creation
    if (passwordChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User changed their password recently, please log in again",
          401
        )
      );
    }
  }

  req.user = currentUser;
  next();
});
///////////////////////////////////////////////////////
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    //access roles
    //access registered user
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("you are not allowed to access this route", 403)
      );
    }
    next();
  });
