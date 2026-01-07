const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    gameType: {
      type: String,
      enum: [
        'breathing',
        'gratitude',
        'mindful_match',
        'thought_catcher',
        'guided_meditation'
      ],
      required: true
    },

    duration: {
      type: Number, // seconds
      required: true,
      min: 5,
      max: 3600
    },

    score: {
      type: Number,
      default: 0,
      min: 0
    },

    /* =========================
       GAME METRICS
    ========================= */
    metrics: {
      breathsCompleted: { type: Number, min: 0 },
      itemsAdded: { type: Number, min: 0 },
      accuracy: { type: Number, min: 0, max: 1 },

      stressBefore: { type: Number, min: 0, max: 10 },
      stressAfter: { type: Number, min: 0, max: 10 },
      stressDelta: Number
    },

    /* =========================
       AI & QUALITY SIGNALS
    ========================= */
    engagementScore: {
      type: Number, // 0–1
      min: 0,
      max: 1
    },

    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },

    completed: {
      type: Boolean,
      default: true
    },

    /* =========================
       ACHIEVEMENTS
    ========================= */
    achievementsUnlocked: {
      type: [String],
      default: []
    },

    wellnessImpact: {
      type: Number // +ve improves wellness, -ve reduces
    }
  },
  {
    timestamps: true
  }
);

/* =====================================================
   🧮 PREVENT DUPLICATE SESSIONS (PER USER, GAME, DAY)
===================================================== */
gameSessionSchema.index(
  {
    userId: 1,
    gameType: 1,
    createdAt: 1
  },
  {
    unique: false
  }
);

/* =====================================================
   🧠 CORE INTELLIGENCE (PRE-SAVE)
===================================================== */
gameSessionSchema.pre('save', function (next) {

  /* ---------- 1️⃣ Stress Delta ---------- */
  if (
    typeof this.metrics?.stressBefore === 'number' &&
    typeof this.metrics?.stressAfter === 'number'
  ) {
    this.metrics.stressDelta =
      this.metrics.stressAfter - this.metrics.stressBefore;
  }

  /* ---------- 2️⃣ AI Engagement Scoring ---------- */
  let engagement = 0;

  if (this.duration >= 60) engagement += 0.3;
  if (this.metrics?.accuracy >= 0.7) engagement += 0.3;
  if (this.metrics?.itemsAdded >= 3) engagement += 0.2;
  if (this.completed) engagement += 0.2;

  this.engagementScore = Math.min(1, engagement);

  /* ---------- 3️⃣ Wellness Impact ---------- */
  let wellness = 0;

  if (this.metrics?.stressDelta < 0) {
    wellness += Math.abs(this.metrics.stressDelta) * 2;
  }

  wellness += this.engagementScore * 5;
  this.wellnessImpact = Number(wellness.toFixed(2));

  /* ---------- 4️⃣ Difficulty Adaptation ---------- */
  if (this.engagementScore > 0.75) {
    this.difficultyLevel = 'hard';
  } else if (this.engagementScore > 0.4) {
    this.difficultyLevel = 'medium';
  } else {
    this.difficultyLevel = 'easy';
  }

  /* ---------- 5️⃣ Achievements ---------- */
  const achievements = [];

  if (this.gameType === 'breathing' && this.metrics?.breathsCompleted >= 10) {
    achievements.push('Calm Breather');
  }

  if (this.gameType === 'gratitude' && this.metrics?.itemsAdded >= 5) {
    achievements.push('Gratitude Grower');
  }

  if (this.engagementScore >= 0.9) {
    achievements.push('Mindful Master');
  }

  if (this.wellnessImpact >= 8) {
    achievements.push('Wellness Booster');
  }

  this.achievementsUnlocked = achievements;

  next();
});

/* =====================================================
   ⚡ INDEXES FOR SPEED
===================================================== */
gameSessionSchema.index({ userId: 1, createdAt: -1 });
gameSessionSchema.index({ gameType: 1, createdAt: -1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
