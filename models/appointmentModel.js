const mongoose = require("mongoose");

// const UserModel = require("./userModel");
// const NurseModel = require("./nurseModel");
// Define the Appointment schema
const appointmentSchema = new mongoose.Schema({
  appointmentType: String,
  serviceOption: String,
  frequency: String,
  haveAvailableRoom: Boolean,
  areTherePoepleWithUser: Boolean,
  nurse: {
    type: mongoose.Schema.ObjectId,
    ref: "Nurse",
    required: [true, "appointment must belong to nurse"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "appointment must belong to user"],
  },
  appointmentCode: Number,
  date: {
    type: String,
    required: true,
  },
  end: String,
  time: {
    type: String,
    required: true,
  },
  days: Number,
  dateTime: Date,
  notes: {
    type: String,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  taxPrice: {
    type: Number,
    default: 0,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  transferred: {
    type: Boolean,
    default: false,
  },
  paidAt: Date,
  paymentIntentId: String,

  refundedAt: Date,
  refundId: String,

  transferredAt: Date,
  transferId: String,

  userConfirm: {
    type: Boolean,
    default: false,
  },
  nurseAcceptance: {
    type: Boolean,
    default: false,
  },
  nurseRejection: {
    type: Boolean,
    default: false,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  cancelled: {
    type: Boolean,
    default: false,
  },
  cancelReason: String,
});

// appointmentSchema.post("save", async function () {
//   await UserModel.findByIdAndUpdate(
//     this.user,
//     {
//       $addToSet: { currentAppointments: this._id },
//     },
//     { new: true }
//   );
// });

// appointmentSchema.post("save", async function () {
//   await NurseModel.findByIdAndUpdate(
//     this.nurse,
//     {
//       $addToSet: { currentAppointments: this._id },
//     },
//     { new: true }
//   );
// });

// Create the Appointment model
const AppointmentModel = mongoose.model("Appointment", appointmentSchema);

module.exports = AppointmentModel;
