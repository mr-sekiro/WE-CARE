const { check } = require("express-validator");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const ReviewModel = require("../../models/reviewModel");
const NurseModel = require("../../models/nurseModel");

exports.getReviewValidator = [
  check("id").isMongoId().withMessage("invalid review id format"),
  validatorMiddleware,
];

exports.createReviewValidator = [
  check("review").optional(),
  check("rating")
    .notEmpty()
    .withMessage("rating value required")
    .isFloat({ min: 1, max: 5 })
    .withMessage("rating value must be between 1 and 5"),
  check("nurse")
    .isMongoId()
    .withMessage("invalid nurse id format")
    //check if nurse exist in DB or not
    .custom((val, { req }) =>
      NurseModel.findById(val).then((nurse) => {
        if (!nurse) {
          return Promise.reject(new Error(`No nurse for this id: ${val}`));
        }
      })
    )
    .custom((val, { req }) =>
      //check if logged user create review before
      ReviewModel.findOne({ user: req.user._id, nurse: req.body.nurse }).then(
        (review) => {
          if (review) {
            return Promise.reject(new Error("you already posted a review"));
          }
        }
      )
    ),
  validatorMiddleware,
];

exports.updateReviewValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid governorate id format")
    .custom((val, { req }) =>
      //check review ownership before update
      ReviewModel.findById(val).then((review) => {
        if (!review) {
          return Promise.reject(
            new Error(`there is no review for this id: ${val}`)
          );
        }
        if (review.user.toString() !== req.user._id.toString()) {
          return Promise.reject(
            new Error("you are not allowed to update this review")
          );
        }
      })
    ),
  validatorMiddleware,
];

exports.deleteCityValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid review id format")
    .custom((val, { req }) => {
      //check review ownership before update
      if (req.user.role === "user") {
        return ReviewModel.findById(val).then((review) => {
          if (!review) {
            return Promise.reject(
              new Error(`there is no review for this id: ${val}`)
            );
          }
          if (review.user.toString() !== req.user._id.toString()) {
            return Promise.reject(
              new Error("you are not allowed to update this review")
            );
          }
        });
      }
      return true;
    }),
  validatorMiddleware,
];
