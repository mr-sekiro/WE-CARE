const mongoose = require("mongoose");

const GovernorateModel = require("./governorateModel");

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "City required"],
      unique: [true, "City must be unique"],
      minlength: [3, "Too short name"],
      maxlength: [32, "Too long name"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    nurses: {
      type: Number,
      min: [0, "nurses must be above or equal to 0"],
      default: 0,
    },
    governorate: {
      type: mongoose.Schema.ObjectId,
      ref: "Governorate",
      required: [true, "city must belong to governorate"],
    },
  },
  { timestamps: true }
);
//populate governorate of city
// citySchema.pre(/^find/, function (next) {
//   this.populate({ path: "governorate", select: "name -_id" });
//   next();
// });

citySchema.statics.calcCitiesQuantity = async function (governorateId) {
  const result = await this.aggregate([
    // Stage 1 : get all cities in specific governorate
    {
      $match: { governorate: governorateId },
    },
    // Stage 2: Grouping cities based on governorateId and calc quantity
    {
      $group: {
        _id: "governorate",
        quantity: { $sum: 1 },
      },
    },
  ]);

  // console.log(result);
  if (result.length > 0) {
    await GovernorateModel.findByIdAndUpdate(governorateId, {
      cities: result[0].quantity,
    });
  } else {
    await GovernorateModel.findByIdAndUpdate(governorateId, {
      cities: 0,
    });
  }
};

citySchema.post("save", async function () {
  await this.constructor.calcCitiesQuantity(this.governorate);
});


//Create Model
const CityModel = mongoose.model("City", citySchema);
module.exports = CityModel;
