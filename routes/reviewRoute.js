const express = require("express");

const reviewValidator = require("../utils/validators/reviewsValidators");
const {
  createReview,
  getReviews,
  getReview,
  updateReview,
  deleteReview,
  createFilterObj,
  setNurseIdToBody,
} = require("../services/reviewService");
const authService = require("../services/authService");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(createFilterObj, getReviews)
  .post(
    authService.protect,
    authService.allowedTo("user"),
    setNurseIdToBody,
    reviewValidator.createReviewValidator,
    createReview
  );

router
  .route("/:id")
  .get(reviewValidator.getReviewValidator, getReview)
  .post(
    authService.protect,
    authService.allowedTo("user"),
    reviewValidator.updateReviewValidator,
    updateReview
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin", "user"),
    reviewValidator.deleteCityValidator,
    deleteReview
  );

module.exports = router;
