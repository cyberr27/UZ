const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const ratingsRoutes = require("./routes/ratings");
const path = require("path");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");
const { WebSocketServer } = require("ws");
const http = require("http");
const User = require("./models/User");
const PrivateMessage = require("./models/PrivateMessage");
const topicRoutes = require("./routes/topics");
const Topic = require("./models/Topic");
const TopicMessage = require("./models/TopicMessage");

dotenv.config();
const app = express();
const server = http.createServer(app);

// Инициализируем topicSubscriptions как Map
const topicSubscriptions = new Map(); // Добавляем эту строку
const clients = new Map(); // Для хранения WebSocket-клиентов

console.log("CLOUDINARY_URL:", process.env.CLOUDINARY_URL ? "Set" : "Not set");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");

try {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not set in environment variables");
  }
  console.log("Configuring Cloudinary with CLOUDINARY_URL");
  cloudinary.config();
  console.log("Cloudinary configuration:", {
    cloud_name: cloudinary.config().cloud_name,
    api_key: cloudinary.config().api_key,
    api_secret: cloudinary.config().api_secret ? "Set" : "Not set",
  });
} catch (error) {
  console.error("Cloudinary configuration error:", error.message);
}

app.use(fileUpload());
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "..", "public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err);
      res.status(500).json({ error: "Не вдалося завантажити сторінку" });
    }
  });
});

app.get("/profile", (req, res) => {
  const profilePath = path.join(__dirname, "..", "public", "profile.html");
  res.sendFile(profilePath, (err) => {
    if (err) {
      console.error("Помилка відправки profile.html:", err);
      res
        .status(500)
        .json({ error: "Не вдалося завантажити сторінку профілю" });
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/topics", topicRoutes);

app.post("/api/auth/upload-photo", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ error: "Файл не завантажено" });
    }

    const file = req.files.photo;
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Тільки зображення дозволені!" });
    }
    if (file.size > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: "Файл занадто великий (макс. 5MB)" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "profile_photos",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.data);
    });

    const photoUrl = result.secure_url;
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { photo: photoUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    res.json({ photoUrl });
  } catch (error) {
    console.error("Помилка в /api/auth/upload-photo:", error.message);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res
      .status(500)
      .json({ error: "Помилка завантаження фото: " + error.message });
  }
});

app.post("/api/auth/upload-background-photo", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.files || !req.files.backgroundPhoto) {
      return res.status(400).json({ error: "Файл не завантажено" });
    }

    const file = req.files.backgroundPhoto;
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Тільки зображення дозволені!" });
    }
    if (file.size > 10 * 1024 * 1024) {
      // Ограничение 10MB для фона
      return res
        .status(400)
        .json({ error: "Файл занадто великий (макс. 10MB)" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "background_photos",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.data);
    });

    const backgroundPhotoUrl = result.secure_url;
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { backgroundPhoto: backgroundPhotoUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    res.json({ backgroundPhotoUrl });
  } catch (error) {
    console.error(
      "Помилка в /api/auth/upload-background-photo:",
      error.message
    );
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res
      .status(500)
      .json({
        error: "Помилка завантаження фонового зображення: " + error.message,
      });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Обработка неизвестных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const wss = new WebSocketServer({ server });
app.set("wss", wss); // Делаем WebSocketServer доступным для маршрутов
app.set("topicSubscriptions", topicSubscriptions); // Делаем topicSubscriptions доступным для маршрутов

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const token = urlParams.get("token");
  let userId = null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
    ws.userId = decoded.userId; // Сохраняем userId в объекте ws для идентификации клиента
  } catch (error) {
    console.error("WebSocket auth error:", error.message);
    ws.close(1008, "Invalid token");
    return;
  }

  User.findById(userId)
    .then((user) => {
      if (!user) {
        ws.close(1008, "User not found");
        return;
      }

      clients.set(user.workerId, ws);
      console.log(`User ${user.workerId} connected`);

      // Инициализируем подписки для пользователя
      topicSubscriptions.set(user.workerId, new Set());

      ws.on("message", async (data) => {
        try {
          const messageData = JSON.parse(data);

          if (messageData.type === "subscribe_topic") {
            const topicId = messageData.topicId;
            const subscriptions = topicSubscriptions.get(user.workerId);
            subscriptions.add(topicId);
            console.log(`User ${user.workerId} subscribed to topic ${topicId}`);
            return;
          } else if (messageData.type === "unsubscribe_topic") {
            const topicId = messageData.topicId;
            const subscriptions = topicSubscriptions.get(user.workerId);
            subscriptions.delete(topicId);
            console.log(
              `User ${user.workerId} unsubscribed from topic ${topicId}`
            );
            return;
          } else if (messageData.type === "message") {
            // Общие сообщения
            if (messageData.message.length > 500) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Сообщение слишком длинное (макс. 500 символов)",
                })
              );
              return;
            }
            const broadcastData = {
              type: "message",
              senderId: user.workerId,
              senderName: messageData.senderName,
              message: messageData.message,
              timestamp: new Date().toISOString(),
            };
            clients.forEach((client) => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(broadcastData));
              }
            });
          } else if (messageData.type === "private_message") {
            // Приватные сообщения
            if (messageData.message.length > 500) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Сообщение слишком длинное (макс. 500 символов)",
                })
              );
              return;
            }
            const recipient = await User.findOne({
              workerId: messageData.recipientId,
            });
            if (!recipient) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Отримувача не знайдено",
                })
              );
              return;
            }

            const privateMessage = new PrivateMessage({
              senderId: user.workerId,
              senderName: messageData.senderName,
              recipientId: messageData.recipientId,
              message: messageData.message,
              timestamp: messageData.timestamp,
            });
            await privateMessage.save();

            const privateData = {
              type: "private_message",
              senderId: user.workerId,
              senderName: messageData.senderName,
              message: messageData.message,
              recipientId: messageData.recipientId,
              timestamp: messageData.timestamp,
            };

            const recipientWs = clients.get(messageData.recipientId);
            if (recipientWs && recipientWs.readyState === recipientWs.OPEN) {
              recipientWs.send(JSON.stringify(privateData));
            }
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(privateData));
            }
          }
          // Сообщения в теме теперь обрабатываются через API
        } catch (error) {
          console.error("WebSocket message error:", error.message);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Ошибка обработки сообщения: " + error.message,
            })
          );
        }
      });

      ws.on("close", () => {
        clients.delete(user.workerId);
        topicSubscriptions.delete(user.workerId);
        console.log(`User ${user.workerId} disconnected`);
      });
    })
    .catch((error) => {
      console.error("WebSocket user check error:", error.message);
      ws.close(1008, "Server error");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
