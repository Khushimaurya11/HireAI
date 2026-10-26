const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null, select: false },
    googleId: { type: String, default: null },
    credits: { type: Number, default: Number(process.env.SIGNUP_BONUS_CREDITS) || 100 },
  },
  { timestamps: true }
);

userSchema.methods.deductCredits = function (amount) {
  if (this.credits < amount) throw new Error('Insufficient credits');
  this.credits -= amount;
  return this.credits;
};

userSchema.methods.addCredits = function (amount) {
  this.credits += amount;
  return this.credits;
};

module.exports = mongoose.model('User', userSchema);
