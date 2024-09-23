const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const ReportModel = require("../models/reportModel");

exports.submitReport = asyncHandler(async (req, res, next) => {
  await ReportModel.create({
    content: req.body.content,
    user: req.user._id,
  });
  res.status(200).json({
    status: "success",
  });
});

exports.nurseSubmitReport = asyncHandler(async (req, res, next) => {
  await ReportModel.create({
    content: req.body.content,
    nurse: req.nurse._id,
  });
  res.status(200).json({
    status: "success",
  });
});

exports.getAllREports = asyncHandler(async (req, res, next) => {
  //*Build query*
  const countDocuments = await ReportModel.countDocuments();
  const apiFeatures = new ApiFeatures(ReportModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .search("ReportModel")
    .limitFields()
    .sort()
    .populate("ReportModel");

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const reports = await mongooseQuery;
  res.status(200).json({
    results: reports.length,
    paginationResult,
    data: reports,
  });
});

exports.getSpecificReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const report = await ReportModel.findById(id)
    .populate({
      path: "user",
      select: "name email governorate city",
    })
    .populate({
      path: "nurse",
      select: "name email governorate city",
    });
  if (!report) {
    return next(new ApiError(`no report for this id ${id}`, 404));
  }
  res.status(200).json({ data: report });
});
