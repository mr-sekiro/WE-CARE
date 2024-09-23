const express = require("express");

const authService = require("../services/authService");
const favoritesValidator = require("../utils/validators/favoritesValidator");

const {
  addNurseToFavorites,
  removeNurseFromFavorites,
  getLoggedUserFavorites,
} = require("../services/favoriteService");

const router = express.Router();

router.use(authService.protect, authService.allowedTo("user"));

router
  .route("/")
  .post(favoritesValidator.addNurseToFavoritesValidator, addNurseToFavorites)
  .get(getLoggedUserFavorites);

router.delete(
  "/:nurseId",
  favoritesValidator.removeNurseFromFavoritesValidator,
  removeNurseFromFavorites
);

module.exports = router;
