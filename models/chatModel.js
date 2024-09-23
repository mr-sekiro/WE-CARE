const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  nurse: {
    type: mongoose.Schema.ObjectId,
    ref: "Nurse",
    required: [true, "chat must belong to nurse"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "chat must belong to user"],
  },
  messages: [
    {
      content: {
        type: String,
        required: [true, "content of message required"],
      },
      sender: String,
      receiver: String,
      date: Date,
    },
  ],
});

// Create Model
const ChatModel = mongoose.model("Chat", chatSchema);

module.exports = ChatModel;
