const express = require("express");

const cityRoute = require("./cityRoute");
const governorateValidator = require("../utils/validators/governoratesValidators");
const {
  createGovernorate,
  getGovernorates,
  getGovernorate,
  updateGovernorate,
  deleteGovernorate,
} = require("../services/governorateService");
const authService = require("../services/authService");

const router = express.Router();

router
  .route("/")
  .get(getGovernorates)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    governorateValidator.createGovernorateValidator,
    createGovernorate
  );

router
  .route("/:id")
  .get(governorateValidator.getGovernorateValidator, getGovernorate)
  .post(
    authService.protect,
    authService.allowedTo("admin"),
    governorateValidator.updateGovernorateValidator,
    updateGovernorate
  )
  .delete(
    authService.protect,
    authService.allowedTo("admin"),
    governorateValidator.deleteGovernorateValidator,
    deleteGovernorate
  );

//POST /governorate/:governorateId/cities
//GET /governorate/:governorateId/cities
//GET /governorate/:governorateId/cities/:cityId
router.use("/:governorateId/cities", cityRoute);

module.exports = router;
