const mongoose = require('mongoose');

/* =====================================================
   PATTERN SCHEMA
===================================================== */
const patternSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    patternType: {
      type: String,
      enum: [
        'time_of_day',
        'day_of_week',
        'activity',
        'location',
        'stress_trigger'
      ],
      required: true
    },

    key: {
      type: String, // e.g. Evening, Monday, Work, Home
      required: true,
      trim: true
    },

    stats: {
      occurrences: {
        type: Number,
        default: 1,
        min: 1
      },

      avgMood: {
        type: Number,
        min: 1,
        max: 10
      },

      avgStress: {
        type: Number,
        min: 0,
        max: 10
      }
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.2
    },

    insightMessage: {
      type: String
    },

    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW'
    },

    firstDetectedAt: {
      type: Date,
      default: Date.now
    },

    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/* =====================================================
   UNIQUE PATTERN (NO DUPLICATES)
===================================================== */
patternSchema.index(
  { userId: 1, patternType: 1, key: 1 },
  { unique: true }
);

/* =====================================================
   CONFIDENCE CALCULATION
===================================================== */
patternSchema.methods.recalculateConfidence = function () {
  const factor = Math.min(this.stats.occurrences / 10, 1);
  this.confidence = Number((0.25 + factor * 0.75).toFixed(2));
};

/* =====================================================
   PATTERN DECAY (OLD HABITS FADE)
===================================================== */
patternSchema.methods.applyDecay = function () {
  const daysOld =
    (Date.now() - new Date(this.lastUpdated)) / (1000 * 60 * 60 * 24);

  if (daysOld > 7) {
    this.confidence = Number((this.confidence * 0.9).toFixed(2));
  }
};

/* =====================================================
   INSIGHT MESSAGE GENERATOR
===================================================== */
patternSchema.methods.generateInsight = function () {
  const mood = this.stats.avgMood;
  const stress = this.stats.avgStress;

  if (mood <= 3) {
    return `Your mood tends to be lower during ${this.key}. Consider a calming activity then.`;
  }

  if (stress >= 7) {
    return `Higher stress is often detected around ${this.key}. Try breathing or a short break.`;
  }

  return `You seem emotionally balanced during ${this.key}. Keep it up!`;
};

/* =====================================================
   RISK LEVEL CLASSIFIER
===================================================== */
patternSchema.methods.calculateRisk = function () {
  if (this.stats.avgStress >= 7 && this.confidence >= 0.6) return 'HIGH';
  if (this.stats.avgStress >= 5) return 'MEDIUM';
  return 'LOW';
};

/* =====================================================
   HELPER: TIME OF DAY
===================================================== */
function getTimeOfDay(hour) {
  if (hour < 6) return 'Late Night';
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

/* =====================================================
   🔥 CORE TRACKER (STATIC METHOD)
===================================================== */
patternSchema.statics.trackFromMoodLog = async function (moodLog) {
  const Pattern = this;

  const {
    userId,
    mood,
    stressPrediction,
    context = {},
    createdAt
  } = moodLog;

  const hour = new Date(createdAt).getHours();
  const day = new Date(createdAt).toLocaleDateString('en-US', {
    weekday: 'long'
  });

  const patterns = [
    { type: 'time_of_day', key: getTimeOfDay(hour) },
    { type: 'day_of_week', key: day }
  ];

  if (context.activity) {
    patterns.push({ type: 'activity', key: context.activity });
  }

  if (context.location) {
    patterns.push({ type: 'location', key: context.location });
  }

  if (mood <= 3) {
    patterns.push({
      type: 'stress_trigger',
      key: context.activity || 'Unknown'
    });
  }

  for (const p of patterns) {
    const existing = await Pattern.findOne({
      userId,
      patternType: p.type,
      key: p.key
    });

    if (existing) {
      existing.stats.occurrences += 1;
      existing.stats.avgMood = (existing.stats.avgMood + mood) / 2;

      if (typeof stressPrediction?.confidence === 'number') {
        const stress = stressPrediction.confidence * 10;
        existing.stats.avgStress =
          typeof existing.stats.avgStress === 'number'
            ? (existing.stats.avgStress + stress) / 2
            : stress;
      }

      existing.lastUpdated = new Date();
      existing.applyDecay();
      existing.recalculateConfidence();
      existing.riskLevel = existing.calculateRisk();
      existing.insightMessage = existing.generateInsight();

      await existing.save();
    } else {
      const stress =
        typeof stressPrediction?.confidence === 'number'
          ? stressPrediction.confidence * 10
          : undefined;

      const pattern = new Pattern({
        userId,
        patternType: p.type,
        key: p.key,
        stats: {
          occurrences: 1,
          avgMood: mood,
          avgStress: stress
        }
      });

      pattern.recalculateConfidence();
      pattern.riskLevel = pattern.calculateRisk();
      pattern.insightMessage = pattern.generateInsight();

      await pattern.save();
    }
  }
};

/* =====================================================
   📊 TOP PATTERNS (FOR DASHBOARD)
===================================================== */
patternSchema.statics.getTopPatterns = function (userId, limit = 3) {
  return this.find({ userId })
    .sort({ confidence: -1 })
    .limit(limit);
};

/* =====================================================
   🚨 EARLY STRESS ALERTS
===================================================== */
patternSchema.statics.getHighRiskPatterns = function (userId) {
  return this.find({
    userId,
    riskLevel: 'HIGH',
    confidence: { $gte: 0.6 }
  });
};

/* =====================================================
   EXPORT
===================================================== */
module.exports = mongoose.model('Pattern', patternSchema);
