const mongoose = require('mongoose');

const voiceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    audioUrl: {
      type: String,
      trim: true
    },

    duration: {
      type: Number, // seconds
      required: true,
      min: 1,
      max: 60
    },

    transcription: {
      type: String,
      trim: true,
      maxlength: 5000
    },

    /* =========================
       ACOUSTIC ANALYSIS (ML READY)
    ========================= */
    analysis: {
      stressScore: {
        type: Number,
        min: 0,
        max: 10,
        required: true
      },

      emotion: {
        type: String,
        enum: [
          'calm',
          'neutral',
          'happy',
          'sad',
          'angry',
          'anxious',
          'fearful'
        ],
        required: true
      },

      confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true
      },

      /* Core voice features */
      rmsEnergy: {
        type: Number,
        min: 0
      },

      zeroCrossingRate: {
        type: Number,
        min: 0
      },

      speechRate: {
        type: Number, // words per minute
        min: 50,
        max: 300
      },

      pitchMean: {
        type: Number // Hz
      },

      pitchVariance: {
        type: Number,
        min: 0
      },

      pauseRatio: {
        type: Number, // silence / total duration
        min: 0,
        max: 1
      },

      /* Emotional dimensions */
      valence: {
        type: Number, // -1 (negative) to +1 (positive)
        min: -1,
        max: 1
      },

      arousal: {
        type: Number, // 0 (calm) to 1 (excited)
        min: 0,
        max: 1
      }
    },

    /* =========================
       PREDICTION METADATA
    ========================= */
    predictionMeta: {
      modelVersion: {
        type: String,
        default: 'v1.0'
      },

      method: {
        type: String,
        enum: ['heuristic', 'ml', 'hybrid'],
        default: 'heuristic'
      },

      reliability: {
        type: Number,
        min: 0,
        max: 1
      }
    },

    insights: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   INDEXES
========================= */

// Fast dashboard fetch
voiceLogSchema.index({ userId: 1, createdAt: -1 });

// Time-series analytics
voiceLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('VoiceLog', voiceLogSchema);
