const messaging = require("../config/firebase");
const UserModel = require("../models/userModel");
const NotificationModel = require("../models/notificationModel");

exports.pushNotification = async (req, res) => {
  try {
    const message = {
      notification: {
        title: "title",
        body: "body",
      },
      token:
        "ey1UpIxFTius80_vUDuoU7:APA91bGWjtKvXGukpGlAdweZDNq_NKBOYzVSwTRLjI-oaCfDj5InqjRMJ89q45zJECq89G0HZdtAuktY74xrrofE9xiNGXpB-y-FSUb6l7zLSE9RyfhpJArob5FnZ7g8QWldQ6nw2xf2",
    };
    const response = await messaging.send(message);
    const notification = await NotificationModel.create({
      body: "body",
      title: "title",
      type: "success",
    });
    const user = await UserModel.findById(req.user._id);

    const bulkOption1 = {
      updateOne: {
        filter: { _id: user._id },
        update: { $push: { notifications: notification._id } },
      },
    };
    await UserModel.bulkWrite([bulkOption1], {});
    console.log("Notification sent successfully:", response);
    res.json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Error sending notification" });
  }
};
