const slugify = require("slugify");
const { check } = require("express-validator");
const bcrypt = require("bcryptjs");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const dateTimeFunction = require("../dateTimeFunction");
const GovernorateModel = require("../../models/governorateModel");
const CityModel = require("../../models/cityModel");
const NurseModel = require("../../models/nurseModel");

exports.createNurseValidator = [
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
  check("phone")
    .notEmpty()
    .withMessage("phone of nurse is required")
    .isMobilePhone("ar-EG")
    .withMessage("wrong phone number")
    .custom((phone) =>
      NurseModel.findOne({ phone }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`phone number already in use`));
        }
      })
    ),
  check("email")
    .notEmpty()
    .withMessage("email of nurse is required")
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address")
    .custom((email) =>
      NurseModel.findOne({ email }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`email already in use`));
        }
      })
    ),
  check("governorate")
    .notEmpty()
    .withMessage("governorate of nurse required")
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
    .withMessage("governorate of nurse required")
    .isMongoId()
    .withMessage("Invalid ID format")
    //check if the city belong to governorate or not
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
    .withMessage("Passward of nurse required")
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
    .withMessage("Passward confirm of nurse required"),
  ///////////
  check("specialization")
    .notEmpty()
    .withMessage("specialization of nurse required")
    .isLength({ min: 2 })
    .withMessage("too short content")
    .isLength({ max: 20 })
    .withMessage("too long content"),
  check("about")
    .notEmpty()
    .withMessage("info of nurse required")
    .isLength({ min: 3 })
    .withMessage("not enough info")
    .isLength({ max: 500 })
    .withMessage("Too much info"),
  check("yearsOfExperience")
    .isNumeric()
    .withMessage("years of experience must be a number")
    .isLength({ min: 0 })
    .withMessage("years of experience must be above or equal to 0")
    .isLength({ max: 40 })
    .withMessage("years of experience must be below or equal to 40"),
  check("patients")
    .optional()
    .isNumeric()
    .withMessage("patients must be a number"),
  check("ratingsAverage")
    .optional()
    .isNumeric()
    .withMessage("ratingsAverage must be a number")
    .isLength({ min: 1 })
    .withMessage("rating must be above or equal to 1.0")
    .isLength({ max: 5 })
    .withMessage("rating must be below or equal to 5.0"),
  check("reviewersNumber")
    .optional()
    .isNumeric()
    .withMessage("reviewersNumber must be a number"),

  validatorMiddleware,
];

exports.getNurseValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

exports.updateNurseValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  ////////////////////
  check("name")
    .optional()
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
  check("dateOfBirth").optional(),
  check("phone")
    .optional()
    .isMobilePhone("ar-EG")
    .withMessage("wrong phone number")
    .custom((phone) =>
      NurseModel.findOne({ phone }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`phone number already in use`));
        }
      })
    ),
  check("email")
    .optional()
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address")
    .custom((email) =>
      NurseModel.findOne({ email }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`email already in use`));
        }
      })
    ),
  check("governorate")
    .optional()
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
    .optional()
    .isMongoId()
    .withMessage("Invalid ID format")
    //check if the city belong to governorate or not
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
  ///////////
  check("specialization")
    .optional()
    .isLength({ min: 2 })
    .withMessage("too short content")
    .isLength({ max: 20 })
    .withMessage("too long content"),
  check("about")
    .optional()
    .isLength({ min: 3 })
    .withMessage("not enough info")
    .isLength({ max: 500 })
    .withMessage("Too much info"),
  check("yearsOfExperience")
    .optional()
    .isNumeric()
    .withMessage("years of experience must be a number")
    .isLength({ min: 0 })
    .withMessage("years of experience must be above or equal to 0")
    .isLength({ max: 40 })
    .withMessage("years of experience must be below or equal to 40"),
  validatorMiddleware,
];

exports.activeNurseValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];


exports.deleteNurseValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

exports.changeNursePasswordValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  check("currentPassword")
    .notEmpty()
    .withMessage("you must enter your current password"),
  check("password")
    .notEmpty()
    .withMessage("you must enter your new password")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 character")
    .custom(async (password, { req }) => {
      const nurse = await NurseModel.findById(req.params.id);
      if (!nurse) {
        throw new Error("there is no nurse for this id");
      }
      //verfiy current password
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        nurse.password
      );
      if (!isCorrectPassword) {
        throw new Error("incorrect current password");
      }
      //verfiy password confirm
      if (password !== req.body.passwordConfirm) {
        throw new Error("password confirmation incorrect");
      }
      return true;
    }),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("you must enter your confirmation password"),

  validatorMiddleware,
];
//logged nurse
exports.changeMyPasswordValidator = [
  check("currentPassword")
    .notEmpty()
    .withMessage("you must enter your current password")
    .custom(async (currentPassword, { req }) => {
      const nurse = await NurseModel.findById(req.nurse._id);
      if (!nurse) {
        throw new Error("there is no nurse for this id");
      }
      //verfiy current password
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        nurse.password
      );
      if (!isCorrectPassword) {
        throw new Error("incorrect current password");
      }
      return true;
    }),
  check("password")
    .notEmpty()
    .withMessage("you must enter your new password")
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
    .withMessage("you must enter your confirmation password"),

  validatorMiddleware,
];

exports.updateMyDataValidator = [
  check("name")
    .optional()
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
  check("dateOfBirth").optional(),
  check("phone")
    .optional()
    .isMobilePhone("ar-EG")
    .withMessage("wrong phone number")
    .custom((phone) =>
      NurseModel.findOne({ phone }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`phone number already in use`));
        }
      })
    ),
  check("email")
    .optional()
    .customSanitizer((value) => value.replace(/\s/g, ""))
    .isEmail()
    .withMessage("wrong email address")
    .custom((email) =>
      NurseModel.findOne({ email }).then((nurse) => {
        if (nurse) {
          return Promise.reject(new Error(`email already in use`));
        }
      })
    ),
  check("governorate")
    .optional()
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
    .optional()
    .isMongoId()
    .withMessage("Invalid ID format")
    //check if the city belong to governorate or not
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
  ///////////
  check("specialization")
    .optional()
    .isLength({ min: 2 })
    .withMessage("too short content")
    .isLength({ max: 20 })
    .withMessage("too long content"),
  check("about")
    .optional()
    .isLength({ min: 3 })
    .withMessage("not enough info")
    .isLength({ max: 500 })
    .withMessage("Too much info"),
  check("yearsOfExperience")
    .optional()
    .isNumeric()
    .withMessage("years of experience must be a number")
    .isLength({ min: 0 })
    .withMessage("years of experience must be above or equal to 0")
    .isLength({ max: 40 })
    .withMessage("years of experience must be below or equal to 40"),
  validatorMiddleware,
];
