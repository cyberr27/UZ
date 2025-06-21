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

router.post("/:topicId/messages", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const topicId = req.params.topicId;
    const { message, senderId, senderName, timestamp } = req.body;

    if (!message || message.length > 500) {
      return res.status(400).json({ error: "Сообщение недопустимой длины" });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Тема не найдена" });
    }
    if (topic.isClosed) {
      return res.status(403).json({ error: "Тема закрыта" });
    }

    // Проверяем дубликат сообщения
    const existingMessage = await TopicMessage.findOne({
      topicId,
      senderId: user.workerId,
      message,
      timestamp: { $gte: new Date(new Date(timestamp).getTime() - 1000) }, // Допуск 1 секунда
    });
    if (existingMessage) {
      console.log(
        `Дублирующееся сообщение в теме ${topicId} от ${user.workerId}`
      );
      return res.status(400).json({ error: "Сообщение уже существует" });
    }

    const topicMessage = new TopicMessage({
      topicId,
      senderId: user.workerId,
      senderName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Аноним",
      message,
      timestamp: timestamp || Date.now(),
    });
    const savedMessage = await topicMessage.save();

    topic.messageCount += 1;
    const uniqueUsers = await TopicMessage.distinct("senderId", { topicId });
    topic.uniqueUsersCount = uniqueUsers.length;
    await topic.save();

    console.log(`Сохранено сообщение ${savedMessage._id} в теме ${topicId}`);

    // Отправляем сообщение через WebSocket
    const topicData = {
      type: "topic_message",
      topicId: topicId,
      messageId: savedMessage._id,
      senderId: user.workerId,
      senderName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Аноним",
      message,
      timestamp: savedMessage.timestamp,
    };

    const wss = req.app.get("wss"); // Получаем WebSocketServer из приложения
    if (wss) {
      wss.clients.forEach((client) => {
        const subscriptions =
          req.app.get("topicSubscriptions").get(client.userId) || new Set();
        if (
          client.readyState === WebSocket.OPEN &&
          subscriptions.has(topicId) &&
          client.userId !== user.workerId
        ) {
          client.send(JSON.stringify(topicData));
          console.log(
            `Отправлено сообщение ${savedMessage._id} в тему ${topicId} для клиента ${client.userId}`
          );
        }
      });
    }

    res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error(
      `Ошибка сохранения сообщения в теме ${req.params.topicId}:`,
      error
    );
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Закрытие темы (только создателем или админом)
router.get("/:topicId/messages", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Токен не предоставлен" });

    jwt.verify(token, process.env.JWT_SECRET);

    const topicId = req.params.topicId;
    console.log(
      `Загрузка сообщений для темы ${topicId}, страница ${req.query.page}`
    );

    // Проверяем, существует ли тема
    const topic = await Topic.findById(topicId);
    if (!topic) {
      console.error(`Тема ${topicId} не найдена`);
      return res.status(404).json({ error: "Тема не найдена" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await TopicMessage.find({ topicId })
      .sort({ timestamp: 1 }) // Сортировка от старых к новым
      .skip(skip)
      .limit(limit);

    const total = await TopicMessage.countDocuments({ topicId });

    console.log(
      `Найдено ${messages.length} сообщений для темы ${topicId}, всего: ${total}`
    );

    res.json({ messages, total, page, limit });
  } catch (error) {
    console.error(
      `Ошибка загрузки сообщений для темы ${req.params.topicId}:`,
      error
    );
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ error: "Недействительный токен" });
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

module.exports = router;
