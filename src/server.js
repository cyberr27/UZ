const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const path = require("path");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");
const { WebSocketServer } = require("ws");
const http = require("http");
const User = require("./models/User");
const PrivateMessage = require("./models/PrivateMessage");

dotenv.config();
const app = express();
const server = http.createServer(app);

// Логування змінних середовища для діагностики
console.log("CLOUDINARY_URL:", process.env.CLOUDINARY_URL ? "Set" : "Not set");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");

// Конфігурація Cloudinary
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

// Middleware
app.use(fileUpload());
app.use(cors());
app.use(express.json());

// Обслуговування статичних файлів
app.use(express.static(path.join(__dirname, "..", "public")));

// Маршрут для головної сторінки
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "..", "public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err);
      res.status(500).json({ error: "Не вдалося завантажити сторінку" });
    }
  });
});

// Маршрут для страницы профиля пользователя
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

// Підключаємо маршрути
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Маршрут для завантаження фото на Cloudinary
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

// Глобальний обробник помилок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Підключення до MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// WebSocket сервер
const wss = new WebSocketServer({ server });

const clients = new Map();

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const token = urlParams.get("token");
  let userId = null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
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

      ws.on("message", async (data) => {
        try {
          const messageData = JSON.parse(data);
          if (messageData.type === "message") {
            const broadcastData = {
              type: "message",
              senderId: user.workerId,
              senderName: messageData.senderName,
              message: messageData.message,
              timestamp: new Date().toISOString(),
            };
            clients.forEach((client, clientId) => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(broadcastData));
              }
            });
          } else if (messageData.type === "private_message") {
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

            // Сохраняем приватное сообщение в базе
            const privateMessage = new PrivateMessage({
              senderId: user.workerId,
              senderName: messageData.senderName,
              recipientId: messageData.recipientId,
              message: messageData.message,
              timestamp: messageData.timestamp,
            });
            await privateMessage.save();

            // Отправляем сообщение отправителю и получателю
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
        } catch (error) {
          console.error("WebSocket message error:", error.message);
        }
      });

      ws.on("close", () => {
        clients.delete(user.workerId);
        console.log(`User ${user.workerId} disconnected`);
      });
    })
    .catch((error) => {
      console.error("WebSocket user check error:", error.message);
      ws.close(1008, "Server error");
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
