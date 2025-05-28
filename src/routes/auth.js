const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Backend validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Некорректный формат email" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль должен быть не короче 6 символов" });
    }

    // Check for existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email уже зарегистрирован" });
    }

    const user = new User({
      email,
      password,
      username: "", // Пустое значение по умолчанию
      firstName: "",
      lastName: "",
      middleName: "",
    });
    await user.save();
    res.status(201).json({ message: "Пользователь успешно зарегистрирован" });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Некорректный формат email" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Неверные учетные данные" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Неверные учетные данные" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

// Update profile
router.put("/update", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не предоставлен" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username, firstName, lastName, middleName } = req.body;

    // Validate username if provided
    if (username && username.length < 3) {
      return res
        .status(400)
        .json({ error: "Имя пользователя должно быть не короче 3 символов" });
    }

    // Check for existing username
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: decoded.userId },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Имя пользователя занято" });
      }
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        username: username || "",
        firstName: firstName || "",
        lastName: lastName || "",
        middleName: middleName || "",
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({
      user: {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недействительный токен" });
    }
    res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
});

module.exports = router;
