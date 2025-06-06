const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  middleName: { type: String, default: "" },
  position: { type: String, default: "" },
  employeeId: { type: String, default: "" },
  workerId: { type: Number, unique: true }, // Новое поле для ID працівника
  photo: { type: String, default: "" },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  // Автоматическое присвоение workerId, если он не задан
  if (this.isNew && !this.workerId) {
    try {
      const lastUser = await mongoose
        .model("User")
        .findOne()
        .sort({ workerId: -1 });
      this.workerId = lastUser && lastUser.workerId ? lastUser.workerId + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
