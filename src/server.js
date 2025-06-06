const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const path = require("path");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

const User = require("./models/User");

dotenv.config();
const app = express();

// Логування змінних середовища для діагностики
console.log("CLOUDINARY_URL:", process.env.CLOUDINARY_URL ? "Set" : "Not set");

// Конфігурація Cloudinary виключно через CLOUDINARY_URL
try {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not set in environment variables");
  }
  console.log("Configuring Cloudinary with CLOUDINARY_URL");
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
  // Перевіряємо конфігурацію
  console.log("Cloudinary configuration:", {
    cloud_name: cloudinary.config().cloud_name,
    api_key: cloudinary.config().api_key,
    api_secret: cloudinary.config().api_secret ? "Set" : "Not set",
  });
} catch (error) {
  console.error("Cloudinary configuration error:", error.message);
  // Вирішуй, чи зупиняти сервер, чи продовжувати без Cloudinary
  // Наприклад, можна не зупиняти, але попередити, що завантаження фото не працюватиме
}

// Middleware
app.use(fileUpload());
app.use(cors());
app.use(express.json());

// Обслуговування статичних файлів
app.use(express.static(path.join(__dirname, "../public")));

// Маршрут для головної сторінки
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err);
      res.status(500).json({ error: "Не вдалося завантажити сторінку sixth" });
    }
  });
});

// Підключаємо маршрути авторизації
app.use("/api/auth", authRoutes);

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

    // Завантаження на Cloudinary
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

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
