const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const {
  sanitizeGovernorate,
  sanitizeGovernoratesList,
} = require("../utils/sanitizeData");
const GovernorateModel = require("../models/governorateModel");

//@desc     Get governorates
//@route    GET /api/v1/governorates
//@access   Public
exports.getGovernorates = asyncHandler(async (req, res) => {
  //*Build query*
  const countDocuments = await GovernorateModel.countDocuments();
  const apiFeatures = new ApiFeatures(GovernorateModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .search("GovernorateModel")
    .limitFields()
    .sort();

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const governorates = await mongooseQuery;
  res.status(200).json({
    results: governorates.length,
    paginationResult,
    data: sanitizeGovernoratesList(governorates),
  });
});

//@desc     Get specific governorate by id
//@route    GET /api/v1/governorates/:id
//@access   Public
exports.getGovernorate = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const governorate = await GovernorateModel.findById(id);
  if (!governorate) {
    return next(new ApiError(`no governorate for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeGovernorate(governorate) });
});

//@desc     Cerate governorate
//@route    POST /api/v1/governorates
//@access   Private/Admin
exports.createGovernorate = asyncHandler(async (req, res) => {
  const governorate = await GovernorateModel.create(req.body);
  res.status(201).json({ data: sanitizeGovernorate(governorate) });
});

//@desc     Update specific governorate
//@route    POST /api/v1/governorates/:id
//@access   Private/Admin
exports.updateGovernorate = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const governorate = await GovernorateModel.findOneAndUpdate(
    { _id: id },
    req.body,
    { new: true }
  );
  if (!governorate) {
    return next(new ApiError(`no governorate for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeGovernorate(governorate) });
});

//@desc     Delete specific governorate
//@route    DELETE /api/v1/governorates/:id
//@access   Private/Admin
exports.deleteGovernorate = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const governorate = await GovernorateModel.findByIdAndDelete(id);
  if (!governorate) {
    return next(new ApiError(`no governorate for this id ${id}`, 404));
  }
  res.status(204).send();
});
