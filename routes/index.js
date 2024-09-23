const multer = require("multer");

const governorateRoute = require("./governorateRoute");
const cityRoute = require("./cityRoute");
const nurseRoute = require("./nurseRoute");
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const nurseAuthRoute = require("./nurseAuthRoute");
const reviewRoute = require("./reviewRoute");
const favoriteRoute = require("./favoriteRoute");
const appointmentRoute = require("./appointmentRoute");
const chatRoute = require("./chatRoute");
const reportRoute = require("./reportRoute");

const upload = multer();
const mountRoutes = (app) => {
  //Mount Routes
  app.use("/api/v1/governorates", upload.none(), governorateRoute);
  app.use("/api/v1/cities", upload.none(), cityRoute);
  app.use("/api/v1/nurses", nurseRoute);
  app.use("/api/v1/users", upload.none(), userRoute);
  app.use("/api/v1/auth", upload.none(), authRoute);
  app.use("/api/v1/nurseAuth", nurseAuthRoute);
  app.use("/api/v1/reviews", upload.none(), reviewRoute);
  app.use("/api/v1/favorites", upload.none(), favoriteRoute);
  app.use("/api/v1/appointments", upload.none(), appointmentRoute);
  app.use("/api/v1/chat", upload.none(), chatRoute);
  app.use("/api/v1/report", upload.none(), reportRoute);
};

module.exports = mountRoutes;
