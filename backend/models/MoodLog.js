const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    mood: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },

    moodLabel: {
      type: String,
      required: true,
      enum: [
        'Critical',
        'Very Low',
        'Low',
        'Neutral',
        'Good',
        'Very Good',
        'Excellent'
      ],
      trim: true
    },

    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },

    context: {
      tags: {
        type: [String],
        default: []
      },
      location: {
        type: String,
        trim: true,
        default: null
      },
      activity: {
        type: String,
        trim: true,
        default: null
      }
    },

    voiceAnalysis: {
      stressScore: {
        type: Number,
        min: 0,
        max: 10
      },
      emotion: {
        type: String,
        trim: true
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },

    aiResponse: {
      type: String,
      required: true,
      trim: true
    },

    stressPrediction: {
      level: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH']
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      message: {
        type: String,
        trim: true
      }
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   INDEXES
========================= */

// Latest moods for user (dashboard)
moodLogSchema.index({ userId: 1, createdAt: -1 });

// Time-based analytics
moodLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('MoodLog', moodLogSchema);
