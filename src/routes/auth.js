const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Путь относительно routes
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
      return res
        .status(400)
        .json({ error: "Електронна пошта та пароль обов'язкові" });
    }
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "Некоректний формат електронної пошти" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль повинен містити не менше 6 символів" });
    }

    // Check for existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Електронна пошта вже зареєстрована" });
    }

    const user = new User({
      email,
      password,
      firstName: "",
      lastName: "",
      middleName: "",
      position: "", // Инициализация нового поля
      employeeId: "", // Инициализация нового поля
    });
    await user.save();
    res.status(201).json({ message: "Користувач успішно зареєстрований" });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "Некоректний формат електронної пошти" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Невірні облікові дані" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Невірні облікові дані" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        position: user.position,
        employeeId: user.employeeId,
        photo: user.photo,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

// Update profile
router.put("/update", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { firstName, lastName, middleName, position, employeeId, photo } =
      req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        firstName: firstName || "",
        lastName: lastName || "",
        middleName: middleName || "",
        position: position || "",
        employeeId: employeeId || "",
        photo: photo || "",
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    res.json({
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        position: user.position,
        employeeId: user.employeeId,
        photo: user.photo,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

module.exports = router;
