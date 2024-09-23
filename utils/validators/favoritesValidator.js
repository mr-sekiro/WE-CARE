const { check } = require("express-validator");

const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const NurseModel = require("../../models/nurseModel");
const UserModel = require("../../models/userModel");

exports.addNurseToFavoritesValidator = [
  check("nurseId")
    .notEmpty()
    .withMessage("nurse required")
    .isMongoId()
    .withMessage("invalid nurse id format")
    //check if nurse exist in DB or not
    .custom((nurseId, { req }) =>
      NurseModel.findById(nurseId).then((nurse) => {
        if (!nurse) {
          return Promise.reject(new Error(`No nurse for this id: ${nurseId}`));
        }
      })
    )
    //check if nurse is already in favorites or not
    .custom((nurseId, { req }) =>
      UserModel.findById(req.user._id).then((user) => {
        const list = user.favorites;
        if (list.includes(nurseId)) {
          return Promise.reject(
            new Error(`You already add this nurse to favorites`)
          );
        }
      })
    ),
  validatorMiddleware,
];

exports.removeNurseFromFavoritesValidator = [
  check("nurseId")
    .notEmpty()
    .withMessage("nurse required")
    .isMongoId()
    .withMessage("invalid nurse id format")
    .custom((nurseId) =>
      NurseModel.findById(nurseId).then((nurse) => {
        if (!nurse) {
          return Promise.reject(new Error(`No nurse for this id: ${nurseId}`));
        }
      })
    )
    .custom((nurseId, { req }) =>
      UserModel.findById(req.user._id).then((user) => {
        const list = user.favorites;
        if (!list.includes(nurseId)) {
          return Promise.reject(
            new Error(`this nurse does not exist in your favorites list`)
          );
        }
      })
    ),
  validatorMiddleware,
];
