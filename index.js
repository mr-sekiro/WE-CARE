const path = require("path");

const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");

const mountRoutes = require("./routes");
const ApiError = require("./utils/apiError");
const dbConnection = require("./config/database");
const globalErorr = require("./middlewares/errorMiddleware");
const { stripeWebhook } = require("./services/appointmentService");

dotenv.config({ path: "config.env" });

// Connect to db
dbConnection();
//Express App
const app = express();
//enable other domains to access your application
app.use(cors());
app.options("*", cors());
//compress all responses
app.use(compression());
//Checkout webhook
app.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);
//serve files in uploads
app.use(express.static(path.join(__dirname, "uploads")));

//Middlewares
app.use(express.json());
app.get("/success", (req, res) => {
  const scriptDone = "<script>window.open('wecare://done');</script>";
  res.send(`Payment successful .${scriptDone}`);
});
app.get("/cancel", (req, res) => {
  const scriptFailed = "<script>window.open('wecare://failed');</script>";
  res.send(`Payment canceled. You can try again.${scriptFailed}`);
});

// eslint-disable-next-line eqeqeq
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
  console.log(`mode ${process.env.NODE_ENV}`);
}

mountRoutes(app);

app.get("/", (req, res) => {
  res.json("testing");
});

app.all("*", (req, res, next) => {
  next(new ApiError(`can not find this route: ${req.originalUrl}`, 400));
});

//Global error handling middleware for express
app.use(globalErorr);

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

//handel rejection error outside express
process.on("unhandledRejection", (err) => {
  console.log(`unhandledRejection Error ${err.name} | ${err.message}`);
  server.close(() => {
    console.log("Shut down .....");
    process.exit(1);
  });
});
