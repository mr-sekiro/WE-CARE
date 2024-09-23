const slugify = require("slugify");
const { check } = require("express-validator");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const CityModel = require("../../models/cityModel");
const GovernorateModel = require("../../models/governorateModel");

exports.getCityValidator = [
  check("id").isMongoId().withMessage("invalid city id format"),
  validatorMiddleware,
];

exports.createCityValidator = [
  check("name")
    .notEmpty()
    .withMessage("city required")
    .isLength({ min: 3 })
    .withMessage("Too short city name")
    .isLength({ max: 32 })
    .withMessage("Too long city name")
    .custom((name) =>
      CityModel.findOne({ name }).then((city) => {
        if (city) {
          return Promise.reject(new Error(`city already Exist`));
        }
      })
    )
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("nurses")
    .optional()
    .isNumeric()
    .withMessage("nurses must be a number")
    .isLength({ min: 0 })
    .withMessage("nurses must be above or equal to 0"),
  check("governorate")
    .notEmpty()
    .withMessage("city must belong to governorate")
    .isMongoId()
    .withMessage("invalid governorate id format")
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
  validatorMiddleware,
];

exports.updateCityValidator = [
  check("id").isMongoId().withMessage("invalid governorate id format"),
  check("name")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Too short city name")
    .isLength({ max: 32 })
    .withMessage("Too long city name")
    .custom((name) =>
      CityModel.findOne({ name }).then((city) => {
        if (city) {
          return Promise.reject(new Error(`city already Exist`));
        }
      })
    )
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("nurses")
    .optional()
    .isNumeric()
    .withMessage("nurses must be a number")
    .isLength({ min: 0 })
    .withMessage("nurses must be above or equal to 0"),
  check("governorate")
    .optional()
    .isMongoId()
    .withMessage("invalid governorate id format")
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
  validatorMiddleware,
];

exports.deleteCityValidator = [
  check("id").isMongoId().withMessage("invalid city id format"),
  validatorMiddleware,
];
