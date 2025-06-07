const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true }, // workerId відправника
  recipientId: { type: Number, required: true }, // workerId отримувача
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sender: {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
  },
});

module.exports = mongoose.model("Message", messageSchema);
