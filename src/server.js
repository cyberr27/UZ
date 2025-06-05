const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const path = require("path");
const multer = require("multer");
const jwt = require("jsonwebtoken");

// Настраиваем загрузку переменных окружения
dotenv.config();
const app = express();

// Конфигурация Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads/");
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
      return cb(new Error("Только изображения разрешены!"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, "../public")));

// Маршрут для главной страницы
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Ошибка отправки index.html:", err);
      res.status(500).json({ error: "Не удалось загрузить страницу" });
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
      return res.status(401).json({ error: "Токен не предоставлен" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }
    const photoUrl = `/uploads/${req.file.filename}`;
    const User = require("../models/User"); // Импортируем модель здесь
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { photo: photoUrl },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    res.json({ photoUrl });
  } catch (error) {
    console.error("Ошибка в /api/auth/upload-photo:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недействительный токен" });
    }
    res.status(500).json({ error: "Ошибка загрузки фото: " + error.message });
  }
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
