const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const {
  sanitizeReview,
  sanitizeReviewsList,
} = require("../utils/sanitizeData");
const ReviewModel = require("../models/reviewModel");

//nested route
exports.setNurseIdToBody = (req, res, next) => {
  if (req.params.nurseId) req.body.nurse = req.params.nurseId;
  next();
};
exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.nurseId) filterObject = { nurse: req.params.nurseId };
  req.filterObj = filterObject;
  next();
};

//@desc     Get list of reviews
//@route    GET /api/v1/reviews
//@access   Public
exports.getReviews = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.filterObj) {
    filter = req.filterObj;
  }
  //*Build query*
  const countDocuments = await ReviewModel.countDocuments();
  const apiFeatures = new ApiFeatures(ReviewModel.find(filter), req.query)
    .paginate(countDocuments)
    .filter()
    .search("ReviewModel")
    .limitFields()
    .sort()
    .populate("ReviewModel");

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const reviews = await mongooseQuery;
  res.status(200).json({
    results: reviews.length,
    paginationResult,
    data: sanitizeReviewsList(reviews),
  });
});

//@desc     Get specific review by id
//@route    GET /api/v1/reviews/:id
//@access   Public
exports.getReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const review = await ReviewModel.findById(id)
    .populate({
      path: "user",
      select: "name photo -_id",
    })
    .populate({
      path: "nurse",
      select: "name photo -_id",
    });

  if (!review) {
    return next(new ApiError(`no review for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeReview(review) });
});

//@desc     Cerate review
//@route    POST /api/v1/reviews
//@access   Private
exports.createReview = asyncHandler(async (req, res, next) => {
  req.body.user = req.user._id;
  const lastReview = await ReviewModel.findOne({
    user: req.user._id,
    nurse: req.body.nurse,
  });
  if (lastReview) {
    return next(new ApiError("you already posted a review before"));
  }
  const review = await ReviewModel.create(req.body);
  res.status(201).json({ data: sanitizeReview(review) });
});

//@desc     Update specific review
//@route    POST /api/v1/reviews/:id
//@access   Private
exports.updateReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const review = await ReviewModel.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
  });
  if (!review) {
    return next(new ApiError(`No review found for this ID: ${id}`, 404));
  }
  //trigger "save" event
  review.save();
  res.status(200).json({ data: sanitizeReview(review) });
});

//@desc     Delete specific review
//@route    DELETE /api/v1/reviews/:id
//@access   Private
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const review = await ReviewModel.findByIdAndDelete(id);
  if (!review) {
    return next(new ApiError(`no review for this id ${id}`, 404));
  }
  // After deleting the review, update the reviews average and quantity in the corresponding nurse
  await ReviewModel.calcAverageRatingsAndQuantity(review.nurse);
  res.status(204).send();
});
