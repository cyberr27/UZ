const express = require("express");
const jwt = require("jsonwebtoken");
const PrivateMessage = require("../models/PrivateMessage");
const User = require("../models/User");
const router = express.Router();

// Отправка приватного сообщения
router.post("/private", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { recipientId, message } = req.body;

    if (!recipientId || !message) {
      return res
        .status(400)
        .json({ error: "Отримувач і повідомлення обов'язкові" });
    }

    const sender = await User.findById(decoded.userId);
    if (!sender) {
      return res.status(404).json({ error: "Відправник не знайдений" });
    }

    const recipient = await User.findOne({ workerId: recipientId });
    if (!recipient) {
      return res.status(404).json({ error: "Отримувач не знайдений" });
    }

    const privateMessage = new PrivateMessage({
      senderId: sender.workerId,
      senderName:
        `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "Анонім",
      recipientId,
      message,
      timestamp: new Date(),
    });

    await privateMessage.save();

    // Отправка через WebSocket
    const broadcastData = {
      type: "private_message",
      messageId: privateMessage._id.toString(),
      senderId: sender.workerId,
      senderName: privateMessage.senderName,
      message: privateMessage.message,
      timestamp: privateMessage.timestamp,
    };

    // Отправляем сообщение только получателю и отправителю
    const clients = require("../index").clients; // Предполагается, что clients экспортируется из index.js
    [sender.workerId, recipientId].forEach((clientId) => {
      const client = clients.get(clientId);
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify(broadcastData));
      }
    });

    res.json({ message: "Приватне повідомлення надіслано" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Получение приватных сообщений
router.get("/private", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    const messages = await PrivateMessage.find({
      $or: [{ senderId: user.workerId }, { recipientId: user.workerId }],
    }).sort({ timestamp: 1 });

    res.json({
      messages: messages.map((msg) => ({
        messageId: msg._id.toString(),
        senderId: msg.senderId,
        senderName: msg.senderName,
        message: msg.message,
        timestamp: msg.timestamp,
      })),
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Удаление приватного сообщения
router.delete("/private/:messageId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    const message = await PrivateMessage.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Повідомлення не знайдено" });
    }

    // Проверяем, что пользователь является отправителем или получателем
    if (
      message.senderId !== user.workerId &&
      message.recipientId !== user.workerId
    ) {
      return res
        .status(403)
        .json({ error: "Немає доступу до цього повідомлення" });
    }

    await PrivateMessage.deleteOne({ _id: req.params.messageId });
    res.json({ message: "Повідомлення видалено" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

module.exports = router;
