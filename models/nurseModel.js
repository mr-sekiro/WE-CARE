const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const CityModel = require("./cityModel");

const nurseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "nurse name required"],
      minlength: [5, "Too short name"],
      maxlength: [50, "Too long name"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    dateOfBirth: String,
    age: Number,
    phone: {
      type: String,
      unique: [true, "phone number must be unique"],
      required: [true, "phone of user required"],
      minlength: [11, "wrong phone number"],
      maxlength: [11, "wrong phone number"],
    },
    email: {
      type: String,
      required: [true, "email of user required"],
      unique: [true, "email must be unique"],
      lowercase: true,
    },
    photo: {
      type: String,
      required: [true, "photo of nurse required"],
    },
    idCardFront: {
      type: String,
      required: [true, "front id card of nurse required"],
    },
    idCardBack: {
      type: String,
      required: [true, "back id card of nurse required"],
    },
    certificate: {
      type: String,
      required: [true, "certificate of nurse required"],
    },
    governorate: {
      type: mongoose.Schema.ObjectId,
      ref: "Governorate",
      required: [true, "governorate of nurse required"],
    },
    city: {
      type: mongoose.Schema.ObjectId,
      ref: "City",
      required: [true, "city of nurse required"],
    },
    password: {
      type: String,
      required: [true, "password of user required"],
      minlength: [8, "password must be at least 8 character"],
    },

    stripeAccountId: {
      type: String,
      required: [true, "stripe account id required"],
    },

    verificationCode: String,
    verificationCodeExpires: Date,
    verificationCodeVerified: Boolean,

    passwordChangedAt: Date,

    resetCode: String,
    resetCodeExpires: Date,
    resetCodeVerified: Boolean,
    active: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "nurse",
    },
    specialization: {
      type: String,
      required: [true, "specialization of nurse required"],
      minlength: [2, "too short content"],
      maxlength: [20, "too long content"],
    },
    about: {
      type: String,
      required: [true, "info of nurse required"],
      minlength: [3, "not enough info"],
      maxlength: [500, "too much info"],
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [0, "years of experience must be above or equal to 0"],
      max: [40, "years of experience must be below or equal to 40"],
    },
    patients: {
      type: Number,
      default: 0,
    },
    ratingsAverage: {
      type: Number,
      min: [1, "rating must be above or equal to 1.0"],
      max: [5, "rating must be below or equal to 5.0"],
    },
    reviewersNumber: {
      type: Number,
      default: 0,
    },
    requests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    currentAppointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    completedAppointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    cancelledAppointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
    available: {
      type: Boolean,
      default: true,
    },
    deviceId: String,
  },
  {
    timestamps: true,
    //to enable virtuals populate
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//mongoose query middleware

//populate governorate and city of user
// nurseSchema.pre(/^find/, function (next) {
//   this.populate({ path: "city", select: "name -_id" });
//   this.populate({ path: "governorate", select: "name -_id" });
//   next();
// });

// Virtual populate for reviews
nurseSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "nurse",
  localField: "_id",
  options: {
    // Populate the 'user' field within the 'Review' model
    populate: { path: "user", select: "name -_id" },
  },
});

nurseSchema.statics.calcNursesQuantity = async function (cityId) {
  const result = await this.aggregate([
    // Stage 1 : get all nurses in specific city
    {
      $match: { city: cityId },
    },
    // Stage 2: Grouping nurses based on cityId and calc quantity
    {
      $group: {
        _id: "city",
        quantity: { $sum: 1 },
      },
    },
  ]);

  // console.log(result);
  if (result.length > 0) {
    await CityModel.findByIdAndUpdate(cityId, {
      nurses: result[0].quantity,
    });
  } else {
    await CityModel.findByIdAndUpdate(cityId, {
      nurses: 0,
    });
  }
};

nurseSchema.methods.incrementPatients = async function () {
  this.patients += 1;
  await this.save();
};

nurseSchema.post("save", async function () {
  await this.constructor.calcNursesQuantity(this.city);
});

//hash password after create user
nurseSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

//Create Model
const NurseModel = mongoose.model("Nurse", nurseSchema);
module.exports = NurseModel;
