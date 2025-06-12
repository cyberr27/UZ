const express = require("express");
const jwt = require("jsonwebtoken");
const PrivateMessage = require("../models/PrivateMessage");
const User = require("../models/User");
const router = express.Router();

// Получение всех приватных сообщений пользователя
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

    res.json({ messages });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

module.exports = router;
