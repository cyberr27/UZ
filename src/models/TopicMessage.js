const mongoose = require("mongoose");

const topicMessageSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    required: true,
  },
  senderId: { type: Number, required: true }, // workerId отправителя
  senderName: { type: String, required: true }, // Имя отправителя
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TopicMessage", topicMessageSchema);
