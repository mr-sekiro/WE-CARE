const asyncHandler = require("express-async-handler");

const UserModel = require("../models/userModel");

// @desc    Add nurse to favorites
// @route   POST /api/v1/favorites
// @access  Protected/User
exports.addNurseToFavorites = asyncHandler(async (req, res, next) => {
  // $addToSet => add nurseId to favorites array if nurseId not exist
  const user = await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { favorites: req.body.nurseId },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "nurse added successfully to your favorites.",
    data: user.favorites,
  });
});

// @desc    Remove nurse from favorites
// @route   DELETE /api/v1/favorites/:nurseId
// @access  Protected/User
exports.removeNurseFromFavorites = asyncHandler(async (req, res, next) => {
  // $pull => remove nurseId from favorites array if nurseId exist
  const user = await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { favorites: req.params.nurseId },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "nurse removed successfully from your favorites.",
    data: user.favorites,
  });
});

// @desc    Get logged user favorites
// @route   GET /api/v1/favorites
// @access  Protected/User
exports.getLoggedUserFavorites = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id).populate({
    path: "favorites",
    select:
      "_id name gender dateOfBirth age phone email photo governorate city specialization about yearsOfExperience patients ratingsAverage reviewersNumber",
  });

  // Add isFavorite field to each nurse in favorites
  const favoritesWithIsFavorite = user.favorites.map((favorite) => ({
    ...favorite.toObject(),
    isFavorite: true,
  }));

  res.status(200).json({
    status: "success",
    results: favoritesWithIsFavorite.length,
    data: favoritesWithIsFavorite,
  });
});
