const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    age: {
      type: Number,
      required: true,
      min: 13,
      max: 120
    },

    situationalResponses: {
      type: Map,
      of: String,
      default: {}
    },

    permissions: {
      voice: { type: Boolean, default: false },
      screenTime: { type: Boolean, default: false },
      wearable: { type: Boolean, default: false }
    },

    preferences: {
      notificationTime: { type: String, default: '20:00' },
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' }
    },

    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastLogin: { type: Date, default: null }
    },

    badges: [
      {
        name: String,
        icon: String,
        earnedAt: Date
      }
    ]
  },
  {
    timestamps: true
  }
);

/* =========================
   PASSWORD HASHING
========================= */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* =========================
   PASSWORD CHECK
========================= */
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/* =========================
   STREAK UPDATE
========================= */
userSchema.methods.updateStreak = function () {
  const today = new Date().toDateString();
  const lastLogin = this.streak.lastLogin
    ? new Date(this.streak.lastLogin).toDateString()
    : null;

  if (lastLogin !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastLogin === yesterday.toDateString()) {
      this.streak.current += 1;
    } else {
      this.streak.current = 1;
    }

    this.streak.longest = Math.max(
      this.streak.longest,
      this.streak.current
    );

    this.streak.lastLogin = new Date();
  }

  return this.streak.current;
};

module.exports = mongoose.model('User', userSchema);
