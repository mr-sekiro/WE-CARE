const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const { sanitizeCity, sanitizeCitiesList } = require("../utils/sanitizeData");
const CityModel = require("../models/cityModel");

//nested route
exports.setGovernorateIdToBody = (req, res, next) => {
  if (req.params.governorateId) req.body.governorate = req.params.governorateId;
  next();
};
exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.governorateId)
    filterObject = { governorate: req.params.governorateId };
  req.filterObj = filterObject;
  next();
};

//@desc     Get all cities or Get all cities of specific governorate
//@route    GET /api/v1/cities
//@access   Public
exports.getCities = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.filterObj) {
    filter = req.filterObj;
  }
  //*Build query*
  const countDocuments = await CityModel.countDocuments();
  const apiFeatures = new ApiFeatures(CityModel.find(filter), req.query)
    .paginate(countDocuments)
    .filter()
    .search("CityModel")
    .limitFields()
    .sort()
    .populate("CityModel");

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const cities = await mongooseQuery;
  res
    .status(200)
    .json({
      results: cities.length,
      paginationResult,
      data: sanitizeCitiesList(cities),
    });
});

//@desc     Get specific city by id
//@route    GET /api/v1/cities/:id
//@access   Public
exports.getCity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const city = await CityModel.findById(id).populate({
    path: "governorate",
    select: "name -_id ",
  });
  if (!city) {
    return next(new ApiError(`no city for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeCity(city) });
});

//@desc     Cerate city
//@route    POST /api/v1/cities
//@access   Private/Admin
exports.createCity = asyncHandler(async (req, res) => {
  const city = await CityModel.create(req.body);
  res.status(201).json({ data: sanitizeCity(city) });
});

//@desc     Update specific city
//@route    POST /api/v1/cities/:id
//@access   Private/Admin
exports.updateCity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const city = await CityModel.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
  });
  if (!city) {
    return next(new ApiError(`no city for this id ${id}`, 404));
  }
  city.save();
  res.status(200).json({ data: sanitizeCity(city) });
});

//@desc     Delete specific city
//@route    DELETE /api/v1/cities/:id
//@access   Private/Admin
exports.deleteCity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const city = await CityModel.findByIdAndDelete(id);
  if (!city) {
    return next(new ApiError(`no city for this id ${id}`, 404));
  }
  await CityModel.calcCitiesQuantity(city.governorate);
  res.status(204).send();
});
