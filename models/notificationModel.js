const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: String,
  body: String,
  type: String,
  date: Date,
  status: String,
});

// Create Model
const NotificationModel = mongoose.model("Notification", notificationSchema);

module.exports = NotificationModel;
