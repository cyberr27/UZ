const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true },
  senderName: { type: String, required: true },
  recipientId: { type: Number, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
