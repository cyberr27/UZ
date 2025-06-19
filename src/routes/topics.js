const express = require("express");
const jwt = require("jsonwebtoken");
const Topic = require("../models/Topic");
const TopicMessage = require("../models/TopicMessage");
const User = require("../models/User");
const router = express.Router();

// Создание новой темы
router.post("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const { title } = req.body;
    if (!title || title.trim().length < 3)
      return res.status(400).json({ error: "Название темы слишком короткое" });

    const existingTopic = await Topic.findOne({ title: title.trim() });
    if (existingTopic) {
      return res
        .status(400)
        .json({ error: "Тема с таким названием уже существует" });
    }

    const topic = new Topic({
      title: title.trim(),
      creatorId: user.workerId,
      creatorName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Аноним",
      uniqueUsersCount: 1,
      messageCount: 0,
    });
    await topic.save();

    res.status(201).json({ topic });
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Получение списка тем (с пагинацией и сортировкой)
router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    jwt.verify(token, process.env.JWT_SECRET);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const topics = await Topic.find({ isClosed: false })
      .sort({ messageCount: -1, uniqueUsersCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Topic.countDocuments({ isClosed: false });

    res.json({ topics, total, page, limit });
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Получение информации о теме
router.get("/:topicId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    jwt.verify(token, process.env.JWT_SECRET);

    const topicId = req.params.topicId;
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Тема не найдена" });
    }

    res.json({ topic });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недействительный токен" });
    }
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Получение сообщений в теме
router.get("/:topicId/messages", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    jwt.verify(token, process.env.JWT_SECRET);

    const topicId = req.params.topicId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await TopicMessage.find({ topicId })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);

    const total = await TopicMessage.countDocuments({ topicId });

    res.json({ messages, total, page, limit });
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Закрытие темы (только создателем или админом)
router.put("/:topicId/close", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const topic = await Topic.findById(req.params.topicId);
    if (!topic) return res.status(404).json({ error: "Тема не найдена" });

    if (topic.creatorId !== user.workerId && !user.isAdmin)
      return res.status(403).json({ error: "Нет прав для закрытия темы" });

    topic.isClosed = true;
    await topic.save();

    res.json({ message: "Тема закрыта" });
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

module.exports = router;
