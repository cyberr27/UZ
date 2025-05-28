const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const path = require("path");
const multer = require("multer");

dotenv.config();
const app = express();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Routes
app.use("/api/auth", authRoutes);

// File upload route
app.post("/api/auth/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Токен не надано" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const photoUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { photo: photoUrl },
      { new: true }
    );
    res.json({ photoUrl });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Помилка завантаження фото: " + error.message });
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
