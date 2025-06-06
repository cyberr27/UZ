const fileUpload = require("express-fileupload");
app.use(fileUpload());
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth"); // Путь относительно src
const path = require("path");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

// Импортируем модель User
const User = require("./models/User"); // Путь относительно src

// Настраиваем загрузку переменных окружения
dotenv.config();
const app = express();

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, "../public"))); // Путь к project/public

// Маршрут для главной страницы
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err);
      res.status(500).json({ error: "Не вдалося завантажити сторінку" });
    }
  });
});

// Подключаем маршруты авторизации
app.use("/api/auth", authRoutes);

// Маршрут для загрузки фото на Cloudinary
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
    const result = await cloudinary.uploader
      .upload_stream(
        {
          folder: "profile_photos", // Папка в Cloudinary
          resource_type: "image",
        },
        async (error, result) => {
          if (error) {
            console.error("Помилка завантаження на Cloudinary:", error);
            return res
              .status(500)
              .json({ error: "Помилка завантаження фото: " + error.message });
          }

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
        }
      )
      .end(file.data);
  } catch (error) {
    console.error("Помилка в /api/auth/upload-photo:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res
      .status(500)
      .json({ error: "Помилка завантаження фото: " + error.message });
  }
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
