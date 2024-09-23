const slugify = require("slugify");
const { check } = require("express-validator");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const dateTimeFunction = require("../dateTimeFunction");
const GovernorateModel = require("../../models/governorateModel");
const CityModel = require("../../models/cityModel");
const UserModel = require("../../models/userModel");

exports.signupUserValidator = [
  check("name")
    .notEmpty()
    .withMessage("name required")
    .isLength({ min: 5 })
    .withMessage("Too short name")
    .isLength({ max: 50 })
    .withMessage("Too long name")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("gender")
    .optional()
    .custom((val) => {
      if (val !== "male" && val !== "female") {
        return Promise.reject(new Error(`this gender dose not exist : ${val}`));
      }
      return true;
    }),
  check("dateOfBirth")
    .optional()
    .custom((val, { req }) => {
      req.body.age = dateTimeFunction.calculateAge(val);
      return true;
    }),
  // check("phone")
  //   .optional()
  //   .isMobilePhone("ar-EG")
  //   .withMessage("wrong phone number")
  //   .custom((phone) =>
  //     UserModel.findOne({ phone }).then((user) => {
  //       if (user) {
  //         return Promise.reject(new Error(`phone number already in use`));
  //       }
  //     })
  //   ),
  check("email")
    .notEmpty()
    .withMessage("email of user is required")
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address")
    .custom((email) =>
      UserModel.findOne({ email }).then((user) => {
        if (user) {
          return Promise.reject(new Error(`email already in use`));
        }
      })
    ),
  check("photo").optional(),
  check("governorate")
    .notEmpty()
    .withMessage("governorate of user required")
    .isMongoId()
    .withMessage("Invalid ID format")
    //check if governorate exist in DB or not
    .custom((governorateId) =>
      GovernorateModel.findById(governorateId).then((governorate) => {
        if (!governorate) {
          return Promise.reject(
            new Error(`No governorate for this id: ${governorateId}`)
          );
        }
      })
    ),
  check("city")
    .notEmpty()
    .withMessage("governorate of user required")
    .isMongoId()
    .withMessage("Invalid ID format")
    //check if belong to governorate or not
    .custom((cityId, { req }) =>
      CityModel.find({ governorate: req.body.governorate }).then((cities) => {
        const citiesIds = [];
        cities.forEach((city) => {
          citiesIds.push(city._id.toString());
        });
        //console.log(citiesIds);
        if (!citiesIds.includes(cityId)) {
          return Promise.reject(
            new Error(
              `this city dose not belong to this governorate : ${cityId}`
            )
          );
        }
      })
    ),
  check("password")
    .notEmpty()
    .withMessage("Passward of user required")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 character")
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error("password confirmation incorrect");
      }
      return true;
    }),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("Passward confirm of user required"),
  check("bloodType")
    .optional()
    .custom((val) => {
      if (
        val !== "A+" &&
        val !== "B+" &&
        val !== "AB+" &&
        val !== "O+" &&
        val !== "A-" &&
        val !== "B-" &&
        val !== "AB-" &&
        val !== "O-"
      ) {
        return Promise.reject(
          new Error(`this bloodType dose not exist : ${val}`)
        );
      }
      return true;
    }),
  check("weight").optional().isNumeric().withMessage("weight must be a number"),
  check("hight").optional().isNumeric().withMessage("hight must be a number"),
  validatorMiddleware,
];

exports.loginUserValidator = [
  check("email")
    .notEmpty()
    .withMessage("email of user is required")
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address"),
  check("password")
    .notEmpty()
    .withMessage("Passward of user required")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 character"),
  validatorMiddleware,
];

exports.forgotPasswordUserValidator = [
  check("email")
    .notEmpty()
    .withMessage("email of user is required")
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address"),
  validatorMiddleware,
];

exports.verifyResetCodeValidator = [
  check("resetCode").notEmpty().withMessage("reset code is required"),
  validatorMiddleware,
];
exports.verifyEmailVerificationCodeValidator = [
  check("verificationCode")
    .notEmpty()
    .withMessage("verification code is required"),
  validatorMiddleware,
];

exports.resetPasswordValidator = [
  check("newPassword")
    .notEmpty()
    .withMessage("New password of user required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("New password confirmation of user required")
    .custom((passwordConfirm, { req }) => {
      if (passwordConfirm !== req.body.newPassword) {
        throw new Error("New password confirmation does not match");
      }
      return true;
    }),
  validatorMiddleware,
];
