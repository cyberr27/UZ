const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth"); // Путь относительно src
const path = require("path");
const multer = require("multer");
const jwt = require("jsonwebtoken");

// Импортируем модель User один раз в начале файла
const User = require("./models/User"); // Исправленный путь

// Настраиваем загрузку переменных окружения
dotenv.config();
const app = express();

// Конфигурация Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/uploads/");
    // Проверяем существование директории, если нет — создаем
    require("fs").mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Тільки зображення дозволені!"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, "public")));

// Маршрут для главной страницы
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err);
      res.status(500).json({ error: "Не вдалося завантажити сторінку" });
    }
  });
});

// Подключаем маршруты авторизации
app.use("/api/auth", authRoutes);

// Маршрут для загрузки фото
app.post("/api/auth/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.file) {
      return res.status(400).json({ error: "Файл не завантажено" });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
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
    console.error("Помилка в /api/auth/upload-photo:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    if (error instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ error: "Помилка завантаження: " + error.message });
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
