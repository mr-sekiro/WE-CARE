const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const messaging = require("../config/firebase");
const { getCurrentTimeInEgypt } = require("../utils/dateTimeFunction");
const UserModel = require("../models/userModel");
const NurseModel = require("../models/nurseModel");
const AppointmentModel = require("../models/appointmentModel");
const ChatModel = require("../models/chatModel");

exports.userSendMessage = asyncHandler(async (req, res, next) => {
  const chat = await ChatModel.findById(req.body.chatId);
  if (!chat) {
    return next(new ApiError(`no chat for this id ${req.body.chatId}`, 404));
  }
  const timeInEgypt = getCurrentTimeInEgypt();
  const currentTime = new Date(timeInEgypt);

  const user = await UserModel.findById(chat.user);
  const nurse = await NurseModel.findById(chat.nurse);

  const messageTitle = user.name;
  const messageBody = req.body.message;
  if (nurse.deviceId) {
    const message = {
      data: {
        title: messageTitle,
        body: messageBody,
        type: "message",
        id: chat._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: user.photo,
      },
      token: nurse.deviceId,
    };
    await messaging.send(message);
  }
  await ChatModel.findByIdAndUpdate(
    chat._id,
    {
      $push: {
        messages: {
          content: messageBody,
          sender: "user",
          receiver: "nurse",
          date: currentTime,
        },
      },
    },
    { new: true, runValidators: true }
  );
  res
    .status(200)
    .json({ received: true, message: "message sent successfully" });
});

exports.nurseSendMessage = asyncHandler(async (req, res, next) => {
  const chat = await ChatModel.findById(req.body.chatId);
  if (!chat) {
    return next(
      new ApiError(`No chat found for this ID: ${req.body.chatId}`, 404)
    );
  }

  const timeInEgypt = getCurrentTimeInEgypt();
  const currentTime = new Date(timeInEgypt);

  const user = await UserModel.findById(chat.user);
  const nurse = await NurseModel.findById(chat.nurse);

  if (!user || !nurse) {
    return next(new ApiError("User or Nurse not found", 404));
  }

  const messageTitle = nurse.name;
  const messageBody = req.body.message;
  if (user.deviceId) {
    const message = {
      data: {
        title: messageTitle,
        body: messageBody,
        type: "message",
        id: chat._id.toString(),
        date: getCurrentTimeInEgypt().toString(),
        image: nurse.photo,
      },
      token: user.deviceId,
    };
    await messaging.send(message);
  }
  await ChatModel.findByIdAndUpdate(
    chat._id,
    {
      $push: {
        messages: {
          content: messageBody,
          sender: "nurse",
          receiver: "user",
          date: currentTime,
        },
      },
    },
    { new: true, runValidators: true }
  );
  res
    .status(200)
    .json({ received: true, message: "Message sent successfully" });
});

exports.getLoggedUserChats = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findById(req.user._id).populate({
    path: "chats",
    select: "-user -messages",
    populate: {
      path: "nurse",
      select: "name photo -_id",
    },
  });

  res.status(200).json({
    status: "success",
    results: user.chats.length,
    data: user.chats,
  });
});

exports.getLoggedNurseChats = asyncHandler(async (req, res, next) => {
  const nurse = await NurseModel.findById(req.nurse._id).populate({
    path: "chats",
    select: "-nurse -messages",
    populate: {
      path: "user",
      select: "name photo -_id",
    },
  });

  res.status(200).json({
    status: "success",
    results: nurse.chats.length,
    data: nurse.chats,
  });
});

exports.getSpecificChat = asyncHandler(async (req, res, next) => {
  const chat = await ChatModel.findById(req.params.id)
    .populate({
      path: "nurse",
      select: "name photo",
    })
    .populate({
      path: "user",
      select: "name photo",
    });
  if (!chat) {
    return next(new ApiError(`no chat for this id ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: chat,
  });
});

exports.getSpecificChatByAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await AppointmentModel.findById(req.params.id);
  if (!appointment) {
    return next(
      new ApiError(`no appointment for this id ${req.params.id}`, 404)
    );
  }
  const chat = await ChatModel.findOne({
    user: appointment.user,
    nurse: appointment.nurse,
  })
    .populate({
      path: "nurse",
      select: "name photo -_id",
    })
    .populate({
      path: "user",
      select: "name photo -_id",
    });
  if (!chat) {
    return next(new ApiError(`no chat for this appointment`, 404));
  }

  res.status(200).json({
    status: "success",
    data: chat,
  });
});
