const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const router = express.Router();

// Middleware для перевірки токена
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Токен не надано" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Недійсний токен" });
  }
};

// Отримати список користувачів для чату
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "firstName lastName workerId"
    ).lean();
    res.json({ users });
  } catch (error) {
    console.error("Помилка завантаження користувачів:", error);
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Отримати повідомлення для чату з конкретним користувачем
router.get("/messages", authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.query;
    if (!recipientId) {
      return res
        .status(400)
        .json({ error: "Необхідно вказати ID отримувача" });
    }
    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }
    const messages = await Message.find({
      $or: [
        { senderId: currentUser.workerId, recipientId: Number(recipientId) },
        { senderId: Number(recipientId), recipientId: currentUser.workerId },
      ],
    }).sort({ timestamp: 1 });
    res.json({ messages });
  } catch (error) {
    console.error("Помилка завантаження повідомлень:", error);
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Надіслати повідомлення
router.post("/send", authenticateToken, async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) {
      return res
        .status(400)
        .json({ error: "Необхідно вказати отримувача та текст повідомлення" });
    }
    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }
    const message = new Message({
      senderId: currentUser.workerId,
      recipientId: Number(recipientId),
      text,
      sender: {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
    });
    await message.save();
    res.json({ message: "Повідомлення надіслано" });
  } catch (error) {
    console.error("Помилка надсилання повідомлення:", error);
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

module.exports = router;