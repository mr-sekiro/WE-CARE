const slugify = require("slugify");
const { check } = require("express-validator");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const GovernorateModel = require("../../models/governorateModel");

exports.getGovernorateValidator = [
  check("id").isMongoId().withMessage("invalid governorate id format"),
  validatorMiddleware,
];

exports.createGovernorateValidator = [
  check("name")
    .notEmpty()
    .withMessage("governorate required")
    .isLength({ min: 3 })
    .withMessage("Too short governorate name")
    .isLength({ max: 32 })
    .withMessage("Too long governorate name")
    .custom((name) =>
      GovernorateModel.findOne({ name }).then((governorate) => {
        if (governorate) {
          return Promise.reject(new Error(`governorate already Exist`));
        }
      })
    )
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("cities")
    .optional()
    .isNumeric()
    .withMessage("cities must be a number")
    .isLength({ min: 0 })
    .withMessage("cities must be above or equal to 0"),
  validatorMiddleware,
];

exports.updateGovernorateValidator = [
  check("id").isMongoId().withMessage("invalid governorate id format"),
  check("name")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Too short govrnment name")
    .isLength({ max: 32 })
    .withMessage("Too long govrnment name")
    .custom((name) =>
      GovernorateModel.findOne({ name }).then((governorate) => {
        if (governorate) {
          return Promise.reject(new Error(`governorate already Exist`));
        }
      })
    )
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("cities")
    .optional()
    .isNumeric()
    .withMessage("cities must be a number")
    .isLength({ min: 0 })
    .withMessage("cities must be above or equal to 0"),
  validatorMiddleware,
];

exports.deleteGovernorateValidator = [
  check("id").isMongoId().withMessage("invalid governorate id format"),
  validatorMiddleware,
];
