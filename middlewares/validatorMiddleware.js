const { validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

// @desc find the validation error in the request
const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors
      .array()
      .map((error) => error.msg)
      .join(", ");
    return next(new ApiError(`Validation error: ${errorMessage}`, 400));
  }
  next();
};

module.exports = validatorMiddleware;
