const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "user name required"],
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
      default: "male",
    },
    dateOfBirth: String,
    age: Number,
    // phone: {
    //   type: String,
    //   minlength: [11, "wrong phone number"],
    //   maxlength: [11, "wrong phone number"],
    // },
    email: {
      type: String,
      required: [true, "email of user required"],
      unique: [true, "email must be unique"],
      lowercase: true,
    },
    photo: {
      type: String,
    },
    governorate: {
      type: mongoose.Schema.ObjectId,
      ref: "Governorate",
      required: [true, "governorate of user required"],
    },
    city: {
      type: mongoose.Schema.ObjectId,
      ref: "City",
      required: [true, "city of user required"],
    },
    password: {
      type: String,
      required: [true, "password of user required"],
      minlength: [8, "password must be at least 8 character"],
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
      enum: ["user", "admin"],
      default: "user",
    },
    ////////////////////////////////////////////
    bloodType: {
      type: String,
    },
    weight: {
      type: Number,
    },
    height: {
      type: Number,
    },
    //child reference (one to many)
    favorites: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Nurse",
        default: [],
      },
    ],
    completedAppointments: [
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
    cancelledAppointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    rejectedAppointments: [
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
    deviceId: String,
  },
  { timestamps: true }
);

//populate governorate and city of user
// userSchema.pre(/^find/, function (next) {
//   this.populate({ path: "city", select: "name -_id" });
//   this.populate({ path: "governorate", select: "name -_id" });
//   next();
// });
//hash password after create user
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

//Create Model
const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
