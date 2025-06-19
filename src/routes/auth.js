const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Генерація access-токена
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Генерація refresh-токена
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

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
      position: "",
      employeeId: "",
    });
    await user.save();
    res.status(201).json({ message: "Користувач успішно зареєстрований" });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Зберігаємо refresh-токен у базі
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        position: user.position,
        employeeId: user.employeeId,
        workerId: user.workerId,
        photo: user.photo,
        likesCount: user.likesCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh-токен не надано" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.find((t) => t.token === refreshToken)) {
      return res.status(401).json({ error: "Недійсний refresh-токен" });
    }

    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Оновлюємо refresh-токен у базі
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== refreshToken
    );
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: "Недійсний refresh-токен" });
  }
});

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
        workerId: user.workerId,
        photo: user.photo,
        likesCount: user.likesCount,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
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
        workerId: user.workerId,
        photo: user.photo,
        likesCount: user.likesCount,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

router.get("/user/:workerId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const workerId = parseInt(req.params.workerId);
    const user = await User.findOne({ workerId });
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
        workerId: user.workerId,
        photo: user.photo,
        likesCount: user.likesCount,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

router.use(async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(
          (t) =>
            new Date(t.createdAt) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        await user.save();
      }
    } catch (error) {
      // Ігноруємо помилки верифікації
    }
  }
  next();
});

module.exports = router;
