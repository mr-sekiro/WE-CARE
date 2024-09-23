const mongoose = require("mongoose");

//Create Schema
const reportSchema = new mongoose.Schema(
  {
    content: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: "Nurse",
    },
    date: Date,
  },
  { timestamps: true }
);

//Create Model
const ReportModel = mongoose.model("Report", reportSchema);
module.exports = ReportModel;
