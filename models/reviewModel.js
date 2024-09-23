const mongoose = require("mongoose");

const NurseModel = require("./nurseModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
    },
    rating: {
      type: Number,
      min: [1, "Min rating value is 1.0"],
      max: [5, "Max rating value is 5.0"],
      required: [true, "rating of nurse required"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "review must belong to user"],
    },
    //parent reference (one to many)
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: "Nurse",
      required: [true, "review must belong to nurse"],
    },
  },
  { timestamps: true }
);

// reviewSchema.pre(/^find/, function (next) {
//     this.populate({ path: "user", select: "name -_id" });
//     this.populate({ path: "nurse", select: "name -_id" });
//     next();
//   });

reviewSchema.statics.calcAverageRatingsAndQuantity = async function (nurseId) {
  const result = await this.aggregate([
    // Stage 1 : get all reviews of specific nurse
    {
      $match: { nurse: nurseId },
    },
    // Stage 2: Grouping reviews based on nurseId and calc avgRatings, ratingsQuantity
    {
      $group: {
        _id: "nurse",
        avgRatings: { $avg: "$rating" },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  // console.log(result);
  if (result.length > 0) {
    await NurseModel.findByIdAndUpdate(nurseId, {
      ratingsAverage: result[0].avgRatings,
      reviewersNumber: result[0].ratingsQuantity,
    });
  } else {
    await NurseModel.findByIdAndUpdate(nurseId, {
      ratingsAverage: 0,
      reviewersNumber: 0,
    });
  }
};

reviewSchema.post("save", async function () {
  await this.constructor.calcAverageRatingsAndQuantity(this.nurse);
});

const ReviewModel = mongoose.model("Review", reviewSchema);
module.exports = ReviewModel;
