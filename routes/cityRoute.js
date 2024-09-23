const express = require("express");

const cityValidator = require("../utils/validators/citiesValidators");
const {
  createCity,
  getCities,
  getCity,
  updateCity,
  deleteCity,
  createFilterObj,
  setGovernorateIdToBody,
} = require("../services/cityService");
const authService = require("../services/authService");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(createFilterObj, getCities)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    setGovernorateIdToBody,
    cityValidator.createCityValidator,
    createCity
  );

router
  .route("/:id")
  .get(cityValidator.getCityValidator, getCity)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    cityValidator.updateCityValidator,
    updateCity
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin"),
    cityValidator.deleteCityValidator,
    deleteCity
  );

module.exports = router;
