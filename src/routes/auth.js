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
    const { email, username, password, firstName, lastName, middleName } =
      req.body;

    // Backend validation
    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "Все обязательные поля должны быть заполнены" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Некорректный формат email" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль должен быть не короче 6 символов" });
    }
    if (username.length < 3) {
      return res
        .status(400)
        .json({ error: "Имя пользователя должно быть не короче 3 символов" });
    }

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        error:
          existingUser.email === email
            ? "Email уже зарегистрирован"
            : "Имя пользователя занято",
      });
    }

    const user = new User({
      email,
      username,
      password,
      firstName: firstName || "",
      lastName: lastName || "",
      middleName: middleName || "",
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

module.exports = router;
