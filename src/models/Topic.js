const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  creatorId: { type: Number, required: true }, // workerId создателя
  creatorName: { type: String, required: true }, // Имя создателя
  createdAt: { type: Date, default: Date.now },
  uniqueUsersCount: { type: Number, default: 1 }, // Кол-во уникальных пользователей
  isClosed: { type: Boolean, default: false }, // Закрыта ли тема
});

module.exports = mongoose.model("Topic", topicSchema);