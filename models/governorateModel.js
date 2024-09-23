const mongoose = require("mongoose");

//Create Schema
const governorateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Governorate required"],
      unique: [true, "Governorate must be unique"],
      minlength: [3, "Too short name"],
      maxlength: [32, "Too long name"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    cities: {
      type: Number,
      min: [0, "cities must be above or equal to 0"],
      default: 0,
    },
  },
  { timestamps: true }
);

//Create Model
const GovernorateModel = mongoose.model("Governorate", governorateSchema);
module.exports = GovernorateModel;
