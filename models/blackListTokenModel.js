const mongoose = require("mongoose");

const blackListTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "30d",
  },
});

//Create Model
const BlackListTokenModel = mongoose.model(
  "BlackListToken",
  blackListTokenSchema
);
module.exports = BlackListTokenModel;
