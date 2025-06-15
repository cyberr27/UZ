const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

router.post("/:workerId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const raterId = decoded.userId;
    const workerId = parseInt(req.params.workerId);
    const { isLike } = req.body;

    if (typeof isLike !== "boolean") {
      return res.status(400).json({ error: "isLike має бути boolean" });
    }

    const user = await User.findOne({ workerId });
    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    const rater = await User.findById(raterId);
    if (!rater) {
      return res.status(404).json({ error: "Оцінювача не знайдено" });
    }

    if (user._id.toString() === raterId) {
      return res.status(400).json({ error: "Не можна оцінювати себе" });
    }

    const existingRating = user.ratings.find(
      (r) => r.userId.toString() === raterId
    );
    let likesCount = user.likesCount;

    if (existingRating) {
      if (existingRating.isLike === isLike) {
        return res.status(400).json({ error: "Ви вже поставили цю оцінку" });
      }
      existingRating.isLike = isLike;
      likesCount += isLike ? 1 : -1;
    } else {
      user.ratings.push({ userId: raterId, isLike });
      likesCount += isLike ? 1 : -1;
    }

    user.likesCount = Math.max(0, likesCount);
    await user.save();

    res.json({ likesCount: user.likesCount });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

router.get("/:workerId", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const raterId = decoded.userId;
    const workerId = parseInt(req.params.workerId);

    const user = await User.findOne({ workerId });
    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    const rating = user.ratings.find((r) => r.userId.toString() === raterId);
    res.json({ rating });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Недійсний токен" });
    }
    res.status(500).json({ error: "Помилка сервера: " + error.message });
  }
});

module.exports = router;
