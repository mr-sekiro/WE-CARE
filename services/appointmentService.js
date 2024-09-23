const dotenv = require("dotenv");

dotenv.config({ path: "config.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET);
const asyncHandler = require("express-async-handler");

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const ApiFeatures = require("../utils/apiFeatures");
const ApiError = require("../utils/apiError");
const {
  sanitizeAppointment,
  sanitizeAppoinmentsList,
} = require("../utils/sanitizeData");
const {
  getCurrentTimeInEgypt,
  addDaysToDate,
} = require("../utils/dateTimeFunction");
const messaging = require("../config/firebase");
const NotificationModel = require("../models/notificationModel");
const ChatModel = require("../models/chatModel");
const UserModel = require("../models/userModel");
const NurseModel = require("../models/nurseModel");
const AppointmentModel = require("../models/appointmentModel");

//@desc     Get list of all appointments
//@route    GET /api/v1/Appointments
//@access   protected/Admin
exports.getAllAppointments = asyncHandler(async (req, res) => {
  //*Build query*
  const countDocuments = await AppointmentModel.countDocuments();
  const apiFeatures = new ApiFeatures(AppointmentModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .search("AppointmentModel")
    .limitFields()
    .sort()
    .populate("AppointmentModel");

  //*Execute Query*
  const { mongooseQuery, paginationResult } = apiFeatures;
  const appointments = await mongooseQuery;
  res.status(200).json({
    results: appointments.length,
    paginationResult,
    data: sanitizeAppoinmentsList(appointments),
  });
});

//@desc     Get specific current appointment
//@route    GET /api/v1/Appointments/:id
//@access   protected/Admin
exports.getSpecificAppointment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id)
    .populate({
      path: "nurse",
      select:
        "name gender age phone email photo governorate city specialization",
    })
    .populate({
      path: "user",
      select:
        "name gender age phone email governorate city bloodType weight height",
    });
  if (!appointment) {
    return next(new ApiError(`no appointment for this id ${id}`, 404));
  }
  res.status(200).json({ data: sanitizeAppointment(appointment) });
});
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
// @desc    create Checkout Session
// @route   POST /api/v1/Appointments/checkout-session
// @access  Protected/User
exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id);
  // Check if the currentAppointments list is empty or not
  if (user.currentAppointments.length !== 0) {
    return next(new ApiError("you have appointment that is not completed yet"));
  }
  // app settings
  function getTotalAndTax(appointmentType, frequency, days) {
    if (appointmentType === "fast-service") {
      const costs = Object.freeze({
        opt1: 100,
        opt2: 200,
        opt3: 300,
        opt4: 400,
        opt5: 500,
        opt6: 600,
      });
      const cost = costs[req.body.serviceOption];
      const tax = 0.1 * cost;
      const total = cost + tax;
      return { total, tax };
    }
    if (appointmentType === "full-time-care") {
      if (frequency === "opt1") {
        const cost = 500 * days;
        const tax = 0.05 * cost;
        const total = cost + tax;
        return { total, tax };
      }
      if (frequency === "opt2") {
        const cost = 200 * days;
        const tax = 0.05 * cost;
        const total = cost + tax;
        return { total, tax };
      }
      if (frequency === "opt3") {
        const cost = 250 * days;
        const tax = 0.05 * cost;
        const total = cost + tax;
        return { total, tax };
      }
    }
  }
  const { total, tax } = getTotalAndTax(
    req.body.appointmentType,
    req.body.frequency,
    req.body.days
  );
  // 2) Create appointment code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Create payment session with Stripe
  const metadata = {
    appointmentType: req.body.appointmentType,
    serviceOption: req.body.serviceOption,
    frequency: req.body.frequency,
    haveAvailableRoom: req.body.haveAvailableRoom,
    areTherePoepleWithUser: req.body.areTherePoepleWithUser,
    userId: req.user._id.toString(),
    nurseId: req.body.nurse.toString(),
    appointmentCode: code,
    date: req.body.date,
    time: req.body.time,
    days: req.body.days,
    notes: req.body.notes,
    totalCost: total,
    taxPrice: tax,
  };
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "egp",
          product_data: {
            name: ` Appointment - ${req.body.appointmentType}`,
          },
          unit_amount: total * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${req.protocol}://${req.get("host")}/success`,
    cancel_url: `${req.protocol}://${req.get("host")}/cancel`,
    customer_email: req.user.email,
    metadata: metadata,
  });

  res.status(201).json({
    status: "success",
    sessionUrl: session.url,
    total: total,
    tax: tax,
  });
});
//Webhook
exports.stripeWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { metadata } = session;

    const dateTimeObject = new Date(`${metadata.date}T${metadata.time}`);
    let end;
    if (metadata.appointmentType === "full-time-care") {
      end = addDaysToDate(metadata.date, Number(metadata.days));
    }
    const timeInEgypt = getCurrentTimeInEgypt();

    const appointment = await AppointmentModel.create({
      appointmentType: metadata.appointmentType,
      serviceOption: metadata.serviceOption,
      frequency: metadata.frequency,
      haveAvailableRoom: metadata.haveAvailableRoom,
      areTherePoepleWithUser: metadata.areTherePoepleWithUser,
      nurse: metadata.nurseId,
      user: metadata.userId,
      appointmentCode: metadata.appointmentCode,
      date: metadata.date,
      end: end,
      time: metadata.time,
      days: metadata.days,
      dateTime: dateTimeObject,
      notes: metadata.notes,
      totalCost: metadata.totalCost,
      taxPrice: metadata.taxPrice,
      isPaid: true,
      paidAt: new Date(timeInEgypt),
      paymentIntentId: session.payment_intent,
    });
    // add this appointment to currentAppointments (user,nurse)
    const bulkOption1 = {
      updateOne: {
        filter: { _id: appointment.user },
        update: { $push: { currentAppointments: appointment._id } },
      },
    };
    const bulkOption2 = {
      updateOne: {
        filter: { _id: appointment.nurse },
        update: { $push: { requests: appointment._id } },
      },
    };
    await UserModel.bulkWrite([bulkOption1], {});
    await NurseModel.bulkWrite([bulkOption2], {});
    const user = await UserModel.findById(appointment.user);
    const nurse = await NurseModel.findById(appointment.nurse);
    //send the notification to nurse
    const notificationTitle = "Appointment Request";
    const notificationBody = `${user.name} sent to you a ${metadata.appointmentType} appointment request!`;
    if (nurse.deviceId) {
      const message = {
        data: {
          title: notificationTitle,
          body: notificationBody,
          type: "notification",
          id: appointment._id.toString(),
          date: getCurrentTimeInEgypt().toString(),
          image: user.photo,
        },
        token: nurse.deviceId,
      };
      await messaging.send(message);
    }
    const notification = await NotificationModel.create({
      title: notificationTitle,
      body: notificationBody,
      date: new Date(timeInEgypt),
      status: "true",
    });
    const bulkOption3 = {
      updateOne: {
        filter: { _id: nurse._id },
        update: { $push: { notifications: notification._id } },
      },
    };
    await NurseModel.bulkWrite([bulkOption3], {});
    //send the notification to user
    const notificationTitle2 = "Appointment Request";
    const notificationBody2 = `you make appointment request with ${nurse.name} Successfully !`;
    if (user.deviceId) {
      const message = {
        data: {
          title: notificationTitle2,
          body: notificationBody2,
          type: "notification",
          id: appointment._id.toString(),
          date: getCurrentTimeInEgypt().toString(),
          image: nurse.photo,
        },
        token: user.deviceId,
      };
      await messaging.send(message);
    }
    const notification2 = await NotificationModel.create({
      title: notificationTitle2,
      body: notificationBody2,
      date: new Date(timeInEgypt),
      status: "true",
    });
    const bulkOption4 = {
      updateOne: {
        filter: { _id: user._id },
        update: { $push: { notifications: notification2._id } },
      },
    };
    await UserModel.bulkWrite([bulkOption4], {});
    //create a chat between user and the nurse
    const haveChat = await ChatModel.findOne({
      nurse: nurse._id,
      user: user._id,
    });
    if (!haveChat) {
      const chat = await ChatModel.create({
        nurse: nurse._id,
        user: user._id,
      });
      const bulkOption5 = {
        updateOne: {
          filter: { _id: user._id },
          update: { $push: { chats: chat._id } },
        },
      };
      const bulkOption6 = {
        updateOne: {
          filter: { _id: nurse._id },
          update: { $push: { chats: chat._id } },
        },
      };
      await UserModel.bulkWrite([bulkOption5], {});
      await NurseModel.bulkWrite([bulkOption6], {});
    }
    res
      .status(200)
      .json({ received: true, data: sanitizeAppointment(appointment) });
  }
});
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//@desc     Delete appointment
//@route    DELETE /api/v1/Appointments/:id
//@access   protected/Admin
exports.deleteAppointment = asyncHandler(async (req, res, next) => {
  //Get the  appointment
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`no appointment for this id ${id}`, 404));
  }
  // Remove the  appointment from user, nurse in all relevant arrays
  const bulkOptions = [
    {
      updateOne: {
        filter: { _id: appointment.user },
        update: {
          $pull: {
            currentAppointments: appointment._id,
            completedAppointments: appointment._id,
            rejectedAppointments: appointment._id,
            cancelledAppointments: appointment._id,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: appointment.nurse },
        update: {
          $pull: {
            currentAppointments: appointment._id,
            completedAppointments: appointment._id,
            rejectedAppointments: appointment._id,
            cancelledAppointments: appointment._id,
          },
        },
      },
    },
  ];

  await UserModel.bulkWrite([bulkOptions[0]], {});
  await NurseModel.bulkWrite([bulkOptions[1]], {});
  //delete the  appointment
  await AppointmentModel.findByIdAndDelete(id);
  res.status(204).send();
});
//@desc     User Cancellation appointment
//@route    DELETE /api/v1/Appointments/userCancellation/:id
//@access   protected/User
exports.userCancelAppointment = asyncHandler(async (req, res, next) => {
  //Get the  appointment
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`no appointment for this id ${id}`, 404));
  }
  //check if this  appointment belong to logged user or not
  if (appointment.user.toString() !== req.user._id.toString()) {
    return next(
      new ApiError("You are not allowed to cancel this appointment", 401)
    );
  }
  // Check if the appointment is within the cancellation window (half hour before the scheduled time)
  console.log(appointment.dateTime);
  const appointmentTime = new Date(appointment.dateTime);
  const timeInEgypt = getCurrentTimeInEgypt();
  const currentTime = new Date(timeInEgypt);
  const timeDifference = appointmentTime.getTime() - currentTime.getTime();
  const halfHourInMillis = 30 * 60 * 1000; // half hour in milliseconds
  if (timeDifference < halfHourInMillis && appointment.nurseAcceptance) {
    return next(new ApiError("CancelWithTax"));
  }
  //check if the nurse accept the  appointment or not
  if (appointment.nurseAcceptance) {
    return next(new ApiError("cancelWithTax"));
  }
  // Proceed with cancelling the appointment
  const refund = await stripe.refunds.create({
    payment_intent: appointment.paymentIntentId,
  });
  appointment.refundedAt = new Date(timeInEgypt);
  appointment.refundId = refund.id;
  appointment.cancelled = true;
  appointment.cancelReason = req.body.cancelReason;
  await appointment.save();
  // Remove the  appointment from user's current  appointments and add it to cancelled  appointments
  await UserModel.findByIdAndUpdate(req.user._id, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  // Remove the  appointment from nurse's requests and current appointments and add it to cancelled  appointments
  await NurseModel.findByIdAndUpdate(appointment.nurse, {
    $pull: { requests: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  await NurseModel.findByIdAndUpdate(appointment.nurse, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  const user = await UserModel.findById(appointment.user);
  const nurse = await NurseModel.findById(appointment.nurse);
  //send the notification
  const notificationTitle = "Appointment Cancelled";
  const notificationBody = `${user.name} has cancelled a ${appointment.appointmentType} appointment request!`;
  if (nurse.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: nurse.deviceId,
    };
    await messaging.send(message);
  }
  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "false",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: nurse._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await NurseModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});

//@desc     Cancel appointment (with tax)
//@route    DELETE /api/v1/Appointments/userCancellationWithTax/:id
//@access   protected/User
exports.cancelWithTax = asyncHandler(async (req, res, next) => {
  //Get the  appointment
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`no appointment for this id ${id}`, 404));
  }
  //check if this  appointment belong to logged user or not
  if (appointment.user.toString() !== req.user._id.toString()) {
    return next(
      new ApiError("You are not allowed to cancel this appointment", 401)
    );
  }

  const refund = await stripe.refunds.create({
    payment_intent: appointment.paymentIntentId,
    amount: Math.round((appointment.totalCost - appointment.taxPrice) * 100),
  });
  const timeInEgypt = getCurrentTimeInEgypt();

  appointment.refundedAt = new Date(timeInEgypt);
  appointment.refundId = refund.id;
  appointment.cancelled = true;
  appointment.cancelReason = req.body.cancelReason;
  await appointment.save();
  // Remove the  appointment from user's current  appointments and add it to cancelled  appointments
  await UserModel.findByIdAndUpdate(req.user._id, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  // Remove the  appointment from nurse's requests and current appointments and add it to cancelled  appointments
  await NurseModel.findByIdAndUpdate(appointment.nurse, {
    $pull: { requests: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  await NurseModel.findByIdAndUpdate(appointment.nurse, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { cancelledAppointments: appointment._id },
  });
  const user = await UserModel.findById(appointment.user);
  const nurse = await NurseModel.findById(appointment.nurse);
  //send the notification
  const notificationTitle = "Appointment Cancelled";
  const notificationBody = `${user.name} has cancelled a ${appointment.appointmentType} appointment request!`;
  if (nurse.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: nurse.deviceId,
    };
    await messaging.send(message);
  }
  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "false",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: nurse._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await NurseModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});

//@desc     confirm appointment and add it to completed appointments of user,nurse
//@route    POST /api/v1/appointments/userConfirmation/:id
//@access   protected/user
exports.userConfirmAppointment = asyncHandler(async (req, res, next) => {
  // Get the  appointment and the nurse
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`No appointment found for id ${id}`, 404));
  }
  // Check if this  appointment belongs to the logged-in user
  if (appointment.user.toString() !== req.user._id.toString()) {
    return next(
      new ApiError("You are not allowed to confirm this appointment", 401)
    );
  }
  // Check scheduled time
  const appointmentTime = new Date(appointment.dateTime);
  const timeInEgypt = getCurrentTimeInEgypt();
  const currentTime = new Date(timeInEgypt);
  if (
    appointmentTime > currentTime &&
    appointment.appointmentType === "fast-service"
  ) {
    return next(
      new ApiError("You can not confirm appointment before the scheduled time")
    );
  }
  // Check if the nurse has accepted the  appointment
  if (!appointment.nurseAcceptance) {
    return next(
      new ApiError(
        "You can not confirm this appointment without nurse acceptance"
      )
    );
  }
  // Proceed with confirming the appointment
  // const transfer = await stripe.transfers.create({
  //   amount: Math.round(
  //     (Appointment.totalCost - Appointment.taxPrice) * 100
  //   ),
  //   currency: "egp",
  //   destination: nurse.stripeAccountId,
  // });
  // const timeInEgypt = getCurrentTimeInEgypt();
  // Appointment.transferredAt = new Date(timeInEgypt);
  // Appointment.transferred = true;
  // Appointment.transferId = transfer.id;
  appointment.userConfirm = true;
  appointment.completed = true;
  await appointment.save();

  // Remove the  appointment from user's current  appointments and add it to completed  appointments
  await UserModel.findByIdAndUpdate(req.user._id, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { completedAppointments: appointment._id },
  });

  // Remove the  appointment from nurse's current  appointments and add it to completed  appointments
  const nurse = await NurseModel.findById(appointment.nurse);
  if (nurse) {
    await nurse.incrementPatients();
    await NurseModel.findByIdAndUpdate(appointment.nurse, {
      $pull: { currentAppointments: appointment._id },
      $addToSet: { completedAppointments: appointment._id },
    });
  }
  const user = await UserModel.findById(appointment.user);
  //send the notification
  const notificationTitle = "Appointment Confirmed";
  const notificationBody = `${user.name} has confirmed a ${appointment.appointmentType} appointment is completed!`;
  if (nurse.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: nurse.deviceId,
    };
    await messaging.send(message);
  }

  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "true",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: nurse._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await NurseModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});

// @desc    Get logged user current appointment
// @route   GET /api/v1/appointments/user/getCurrentAppointment
// @access  Protected/User
exports.getLoggedUserCurrentAppointments = asyncHandler(
  async (req, res, next) => {
    const user = await UserModel.findById(req.user._id).populate({
      path: "currentAppointments",
      select: "-user",
      populate: {
        path: "nurse",
        select:
          "name gender age phone email photo governorate city specialization",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });
    res.status(200).json({
      status: "success",
      results: user.currentAppointments.length,
      data: sanitizeAppoinmentsList(user.currentAppointments),
    });
  }
);

// @desc    Get logged user completed appointments
// @route   GET /api/v1/appointments/user/getCompleteAppointments
// @access  Protected/User
exports.getLoggedUserCompletedAppointments = asyncHandler(
  async (req, res, next) => {
    const user = await UserModel.findById(req.user._id).populate({
      path: "completedAppointments",
      select: "-user",
      populate: {
        path: "nurse",
        select:
          "name gender age phone email photo governorate city specialization",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: user.completedAppointments.length,
      data: sanitizeAppoinmentsList(user.completedAppointments),
    });
  }
);

// @desc    Get logged user rejected appointments
// @route   GET /api/v1/appointments/user/getRejectedAppointments
// @access  Protected/User
exports.getLoggedUserRejectedAppointments = asyncHandler(
  async (req, res, next) => {
    const user = await UserModel.findById(req.user._id).populate({
      path: "rejectedAppointments",
      select: "-user",
      populate: {
        path: "nurse",
        select:
          "name gender age phone email photo governorate city specialization",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: user.rejectedAppointments.length,
      data: sanitizeAppoinmentsList(user.rejectedAppointments),
    });
  }
);

// @desc    Get logged user cancelled appointments
// @route   GET /api/v1/appointments//user/getCancelledAppointments
// @access  Protected/User
exports.getLoggedUserCancelledAppointments = asyncHandler(
  async (req, res, next) => {
    const user = await UserModel.findById(req.user._id).populate({
      path: "cancelledAppointments",
      select: "-user",
      populate: {
        path: "nurse",
        select:
          "name gender age phone email photo governorate city specialization",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: user.cancelledAppointments.length,
      data: sanitizeAppoinmentsList(user.cancelledAppointments),
    });
  }
);

////////////////////////////////////////////
////////////////////////////////////////////
//@desc     Accept appointment
//@route    POST /api/v1/appointments/nurseAcceptance/:id
//@access   protected/nurse
exports.nurseAcceptAppointment = asyncHandler(async (req, res, next) => {
  // Get the  appointment
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`No appointment found for id ${id}`, 404));
  }

  // Check if this  appointment belongs to the logged-in nurse
  if (appointment.nurse.toString() !== req.nurse._id.toString()) {
    return next(
      new ApiError("You are not allowed to Accept this appointment", 401)
    );
  }
  // Check if this  appointment is Paid or not
  if (!appointment.isPaid) {
    return next(new ApiError("this appointment is not paid"));
  }

  // Proceed with accepting the appointment
  appointment.nurseAcceptance = true;
  await appointment.save();
  // Add the  appointment to nurse's current appointments
  const bulkOption1 = {
    updateOne: {
      filter: { _id: appointment.nurse },
      update: {
        $pull: { requests: appointment._id },
        $push: { currentAppointments: appointment._id },
      },
    },
  };
  await NurseModel.bulkWrite([bulkOption1], {});

  const timeInEgypt = getCurrentTimeInEgypt();
  const user = await UserModel.findById(appointment.user);
  const nurse = await NurseModel.findById(appointment.nurse);
  //send the notification
  const notificationTitle = "Appointment Accepted";
  const notificationBody = `${nurse.name} has accepted your ${appointment.appointmentType} appointment!`;
  if (user.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: user.deviceId,
    };
    await messaging.send(message);
  }
  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "true",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: user._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await UserModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});
//@desc     reject appointment
//@route    POST /api/v1/appointments/nurseRejection/:id
//@access   protected/nurse
exports.nurseRejectAppointment = asyncHandler(async (req, res, next) => {
  // Get the  appointment
  const { id } = req.params;
  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return next(new ApiError(`No appointment found for id ${id}`, 404));
  }

  // Check if this  appointment belongs to the logged-in nurse
  if (appointment.nurse.toString() !== req.nurse._id.toString()) {
    return next(
      new ApiError("You are not allowed to Reject this appointment", 401)
    );
  }
  // Proceed with rejecting the appointment
  appointment.nurseRejection = true;
  await appointment.save();
  // Remove the  appointment from user's current  appointments and add it to rejected  appointments
  await UserModel.findByIdAndUpdate(appointment.user, {
    $pull: { currentAppointments: appointment._id },
    $addToSet: { rejectedAppointments: appointment._id },
  });

  // Remove the  appointment from nurse's current  appointments
  await NurseModel.findByIdAndUpdate(appointment.nurse, {
    $pull: { requests: appointment._id },
  });
  const timeInEgypt = getCurrentTimeInEgypt();
  const user = await UserModel.findById(appointment.user);
  const nurse = await NurseModel.findById(appointment.nurse);
  //send the notification
  const notificationTitle = "Appointment Rejected";
  const notificationBody = `${nurse.name} has rejected your ${appointment.appointmentType} appointment!`;
  if (user.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: user.deviceId,
    };
    await messaging.send(message);
  }

  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "false",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: user._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await UserModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});

//@desc     Nurse Cancel  appointment
//@route    DELETE /api/v1/Appointments/nurseCancellation/:id
//@access   protected/nurse
exports.nurseCancelAppointment = asyncHandler(async (req, res, next) => {
  //Get the  appointment
  const { id } = req.params;
  const Appointment = await AppointmentModel.findById(id);
  if (!Appointment) {
    return next(new ApiError(`no appointment for this id ${id}`, 404));
  }
  //check if this  appointment belong to logged nurse or not
  if (Appointment.nurse.toString() !== req.nurse._id.toString()) {
    return next(
      new ApiError("You are not allowed to cancel this appointment", 401)
    );
  }
  // Check if the appointment is within the cancellation window (half hour before the scheduled time)
  const appointmentTime = new Date(Appointment.dateTime);
  const timeInEgypt = getCurrentTimeInEgypt();
  const currentTime = new Date(timeInEgypt);
  const timeDifference = appointmentTime.getTime() - currentTime.getTime();
  const halfHourInMillis = 30 * 60 * 1000; // half hour in milliseconds
  if (timeDifference < halfHourInMillis && Appointment.nurseAcceptance) {
    return next(
      new ApiError(
        "You can only cancel appointments at least half hour before the scheduled time"
      )
    );
  }
  // Proceed with cancelling the appointment
  const refund = await stripe.refunds.create({
    payment_intent: Appointment.paymentIntentId,
  });
  Appointment.refundedAt = new Date(timeInEgypt);
  Appointment.refundId = refund.id;
  Appointment.cancelled = true;
  Appointment.cancelReason = req.body.cancelReason;
  await Appointment.save();
  // Remove the  appointment from user's current  appointments and add it to cancelled  appointments
  await UserModel.findByIdAndUpdate(Appointment.user, {
    $pull: { currentAppointments: Appointment._id },
    $addToSet: { cancelledAppointments: Appointment._id },
  });
  // Remove the  appointment from nurse's current  appointments and add it to cancelled  appointments
  await NurseModel.findByIdAndUpdate(Appointment.nurse, {
    $pull: { currentAppointments: Appointment._id },
    $addToSet: { cancelledAppointments: Appointment._id },
  });
  const user = await UserModel.findById(Appointment.user);
  const nurse = await NurseModel.findById(Appointment.nurse);
  //send the notification
  const notificationTitle = "Appointment Cancelled";
  const notificationBody = `${nurse.name} has cancelled your ${Appointment.appointmentType} appointment!`;
  if (user.deviceId) {
    const message = {
      data: {
        title: notificationTitle,
        body: notificationBody,
        type: "notification",
        id: Appointment._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: user.deviceId,
    };
    await messaging.send(message);
  }
  const notification = await NotificationModel.create({
    title: notificationTitle,
    body: notificationBody,
    date: new Date(timeInEgypt),
    status: "false",
  });
  const bulkOption3 = {
    updateOne: {
      filter: { _id: user._id },
      update: { $push: { notifications: notification._id } },
    },
  };
  await UserModel.bulkWrite([bulkOption3], {});
  res.status(200).json({ status: "success" });
});

// @desc    Get logged nurse Requests
// @route   GET /api/v1/appointments/nurse/getRequests
// @access  Protected/Nurse
exports.getLoggedNurseRequests = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findById(req.nurse._id).populate({
    path: "requests",
    select: "-nurse",
    populate: {
      path: "user",
      select:
        "name gender age photo email governorate city bloodType weight height",
      populate: [
        { path: "governorate", select: "name -_id" },
        { path: "city", select: "name -_id" },
      ],
    },
  });

  res.status(200).json({
    status: "success",
    results: nurse.requests.length,
    data: sanitizeAppoinmentsList(nurse.requests),
  });
});

// @desc    Get logged nurse current appointment
// @route   GET /api/v1/appointments/nurse/getCurrentAppointment
// @access  Protected/Nurse
exports.getLoggedNurseCurrentAppointments = asyncHandler(
  async (req, res, next) => {
    const nurse = await NurseModel.findById(req.nurse._id).populate({
      path: "currentAppointments",
      select: "-nurse",
      options: { sort: { dateTime: 1 } }, // Sort by dateTime in ascending order
      populate: {
        path: "user",
        select:
          "name gender age photo email governorate city bloodType weight height",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: nurse.currentAppointments.length,
      data: sanitizeAppoinmentsList(nurse.currentAppointments),
    });
  }
);

// @desc    Get logged nurse completed appointments
// @route   GET /api/v1/appointments/nurse/getCompleteAppointments
// @access  Protected/Nurse
exports.getLoggedNurseCompletedAppointments = asyncHandler(
  async (req, res, next) => {
    const nurse = await NurseModel.findById(req.nurse._id).populate({
      path: "completedAppointments",
      select: "-nurse",
      populate: {
        path: "user",
        select:
          "name gender age photo email governorate city bloodType weight height",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: nurse.completedAppointments.length,
      data: sanitizeAppoinmentsList(nurse.completedAppointments),
    });
  }
);
// @desc    Get logged nurse cancelled appointments
// @route   GET /api/v1/appointments/nurse/getCancelledAppointments
// @access  Protected/Nurse
exports.getLoggedNurseCancelledAppointments = asyncHandler(
  async (req, res, next) => {
    const nurse = await NurseModel.findById(req.nurse._id).populate({
      path: "cancelledAppointments",
      select: "-nurse",
      populate: {
        path: "user",
        select:
          "name gender age photo email governorate city bloodType weight height",
        populate: [
          { path: "governorate", select: "name -_id" },
          { path: "city", select: "name -_id" },
        ],
      },
    });

    res.status(200).json({
      status: "success",
      results: nurse.cancelledAppointments.length,
      data: sanitizeAppoinmentsList(nurse.cancelledAppointments),
    });
  }
);
