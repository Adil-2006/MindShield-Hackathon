const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // For voice data

// Import models
const User = require('./models/User');
const MoodLog = require('./models/MoodLog');
const VoiceLog = require('./models/VoiceLog');
const GameSession = require('./models/GameSession');
const Pattern = require('./models/Pattern');

// ------------------ MONGODB CONNECTION ------------------
const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindshield';

let dbConnected = false;

mongoose.connect(MONGO_URI)
  .then(() => {
    dbConnected = true;
    console.log('✅ MongoDB connected successfully');
    initializeDatabase();
  })
  .catch((err) => {
    dbConnected = false;
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('Continuing without MongoDB. The server will run in demo mode and local fallbacks will be used.');
  });

// Initialize database function
async function initializeDatabase() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('📊 Initializing database with sample data...');
            // Add any initial data here if needed
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// AI Response Generator
function getAIResponse(mood, context = {}) {
    const responses = {
        high: [
            "Wonderful! This positive energy is great! 🌟 How about journaling this moment to remember what worked?",
            "Excellent! Your mood is soaring! 🚀 This is perfect for trying new activities or helping others."
        ],
        medium: [
            "Thanks for checking in. I'm here with you. 🧘 How about a quick mindfulness break to find more balance?",
            "I appreciate you sharing. This is a good moment for gentle reflection. Want to try a short gratitude exercise?"
        ],
        low: [
            "I hear you, and I'm here with you. 💝 Would you like to try a calming activity or just have some quiet support?",
            "Thank you for sharing this with me. It's completely okay to feel this way. Let's try something gentle together."
        ]
    };
    
    let moodCategory = 'medium';
    if (mood >= 7) moodCategory = 'high';
    else if (mood <= 3) moodCategory = 'low';
    
    const options = responses[moodCategory];
    return options[Math.floor(Math.random() * options.length)];
}

// Pattern detection removed from server logic — patterns are managed by the Pattern model.
// Use Pattern.trackFromMoodLog(moodLog) and Pattern.getTopPatterns(userId, limit) for creation and retrieval of patterns.

// Note: Old detectPatterns / analyze* functions were intentionally removed to avoid duplication and conflicts.

// Stress Prediction Algorithm
async function predictStress(userId) {
    try {
        // Get recent logs
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const logs = await MoodLog.find({
            userId,
            timestamp: { $gte: sevenDaysAgo }
        }).sort({ timestamp: -1 }).limit(10);
        
        // Require at least 3 recent logs for a meaningful prediction
        if (logs.length < 3) return null;
        
        // Calculate metrics
        const avgMood = logs.reduce((sum, log) => sum + log.mood, 0) / logs.length;
        const recentAvg = logs.slice(0, 3).reduce((sum, log) => sum + log.mood, 0) / 3;
        const trend = logs[0].mood - logs[logs.length - 1].mood;
        const volatility = calculateVolatility(logs.map(log => log.mood));
        
        // Risk assessment
        let riskLevel = 'LOW';
        let confidence = 0;
        let reasons = [];
        
        if (avgMood < 4) {
            riskLevel = 'MEDIUM';
            confidence += 0.3;
            reasons.push('Low average mood');
        }
        
        if (trend < -1.5) {
            riskLevel = 'HIGH';
            confidence += 0.4;
            reasons.push('Downward trend detected');
        }
        
        if (volatility > 2.5) {
            riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
            confidence += 0.3;
            reasons.push('High mood volatility');
        }
        
        if (riskLevel !== 'LOW') {
            // Check time of day for prediction
            const hour = new Date().getHours();
            let predictionTime = '';
            
            if (hour < 12) predictionTime = 'this afternoon';
            else if (hour < 18) predictionTime = 'this evening';
            else predictionTime = 'tomorrow morning';
            
            return {
                riskLevel,
                confidence: Math.min(confidence, 0.9),
                prediction: `Potential stress ${predictionTime}`,
                reasons,
                suggestions: generateStressSuggestions(riskLevel)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error predicting stress:', error);
        return null;
    }
}

function calculateVolatility(numbers) {
    const avg = numbers.reduce((a, b) => a + b) / numbers.length;
    const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / numbers.length);
}

function generateStressSuggestions(riskLevel) {
    const suggestions = {
        LOW: [
            'Maintain your current routine',
            'Practice daily gratitude',
            'Stay hydrated and take breaks'
        ],
        MEDIUM: [
            'Schedule a 10-minute mindfulness break',
            'Reach out to a friend or family member',
            'Engage in light physical activity',
            'Use the breathing exercise feature'
        ],
        HIGH: [
            'Take immediate 15-minute break',
            'Use crisis resources if needed',
            'Practice deep breathing for 5 minutes',
            'Avoid stressful decisions today',
            'Consider professional support'
        ]
    };
    
    return suggestions[riskLevel] || suggestions.LOW;
}

// ========== API ROUTES ==========

// 1. User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, age, email, responses } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { name }] 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        const user = new User({
            name,
            age,
            email: email || undefined,
            situationalResponses: responses || {},
            streak: {
                current: 1,
                longest: 1,
                lastLogin: new Date()
            }
        });
        
        await user.save();
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                age: user.age,
                streak: user.streak.current
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// 2. Log Mood
app.post('/api/mood', async (req, res) => {
    try {
        const { userId, mood, notes, context, voiceAnalysis } = req.body;
        
        // Validate user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Update user streak
        user.updateStreak();
        await user.save();
        
        // Get mood label
        const moodLabels = {
            9: 'Excellent', 8: 'Very Good', 7: 'Good',
            6: 'Fairly Good', 5: 'Neutral', 4: 'Fairly Low',
            3: 'Low', 2: 'Very Low', 1: 'Critical'
        };
        
        const moodLabel = moodLabels[mood] || 'Unknown';
        
        // Generate AI response
        const aiResponse = getAIResponse(mood, context);
        
        // Predict stress
        const stressPrediction = await predictStress(userId);
        
        // Create mood log
        const moodLog = new MoodLog({
            userId,
            mood,
            moodLabel,
            notes: notes || '',
            context: context || {},
            voiceAnalysis: voiceAnalysis || undefined,
            aiResponse,
            stressPrediction: stressPrediction || undefined
        });
        
        await moodLog.save();
        
        // Record patterns using Pattern model
        await Pattern.trackFromMoodLog(moodLog);
        const patterns = await Pattern.getTopPatterns(userId, 3);

        res.json({
            success: true,
            log: {
                id: moodLog._id,
                mood: moodLog.mood,
                moodLabel: moodLog.moodLabel,
                aiResponse: moodLog.aiResponse,
                stressPrediction: moodLog.stressPrediction,
                timestamp: moodLog.timestamp
            },
            user: {
                streak: user.streak.current,
                longestStreak: user.streak.longest
            },
            patterns: patterns.map(p => ({
                type: p.patternType,
                message: p.insightMessage,
                suggestion: p.riskLevel === 'HIGH' ? 'Consider proactive stress management' : 'Maintain current healthy habits',
                confidence: p.confidence,
                riskLevel: p.riskLevel,
                lastUpdated: p.lastUpdated
            })),
            message: 'Mood logged successfully'
        });
    } catch (error) {
        console.error('Mood logging error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log mood'
        });
    }
});

// 3. Get User Insights
app.get('/api/insights/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { days = 30 } = req.query;
        
        const dateRange = new Date();
        dateRange.setDate(dateRange.getDate() - parseInt(days));
        
        // Get mood logs
        const logs = await MoodLog.find({
            userId,
            timestamp: { $gte: dateRange }
        }).sort({ timestamp: 1 });
        
        // Get patterns
        const patterns = await Pattern.find({ userId });
        
        // Get voice logs
        const voiceLogs = await VoiceLog.find({
            userId,
            timestamp: { $gte: dateRange }
        });
        
        // Calculate statistics
        const stats = calculateStatistics(logs, voiceLogs);
        
        // Get stress prediction
        const stressPrediction = await predictStress(userId);
        
        res.json({
            success: true,
            insights: {
                stats,
                patterns: patterns.map(p => ({
                    type: p.patternType,
                    message: p.insightMessage,
                    suggestion: p.riskLevel === 'HIGH'
                        ? 'Consider proactive stress management'
                        : 'Maintain current healthy habits',
                    confidence: p.confidence || 0,
                    riskLevel: p.riskLevel,
                    lastUpdated: p.lastUpdated
                })),
                stressPrediction,
                recentLogs: logs.slice(-5).reverse().map(log => ({
                    mood: log.mood,
                    moodLabel: log.moodLabel,
                    timestamp: log.timestamp,
                    aiResponse: log.aiResponse
                }))
            }
        });

    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch insights'
        });
    }
});

function calculateStatistics(logs, voiceLogs) {
    if (logs.length === 0) return {};
    
    const moods = logs.map(log => log.mood);
    const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
    
    const weeklyLogs = logs.filter(log => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return log.timestamp >= weekAgo;
    });
    
    const weeklyAvg = weeklyLogs.length > 0 
        ? weeklyLogs.reduce((sum, log) => sum + log.mood, 0) / weeklyLogs.length
        : 0;
    
    const moodDistribution = {
        high: logs.filter(l => l.mood >= 7).length,
        medium: logs.filter(l => l.mood >= 4 && l.mood < 7).length,
        low: logs.filter(l => l.mood < 4).length
    };
    
    return {
        totalLogs: logs.length,
        avgMood: avgMood.toFixed(1),
        weeklyAvg: weeklyAvg.toFixed(1),
        moodDistribution,
        voiceChecks: voiceLogs.length,
        consistency: calculateConsistency(logs)
    };
}

function calculateConsistency(logs) {
    if (logs.length < 2) return 0;
    
    const dates = logs.map(log => new Date(log.timestamp).toDateString());
    const uniqueDays = new Set(dates).size;
    const totalDays = Math.ceil((new Date() - new Date(logs[0].timestamp)) / (1000 * 60 * 60 * 24));
    
    return totalDays > 0 ? (uniqueDays / totalDays) * 100 : 0;
}

// 4. Save Game Session
app.post('/api/games/session', async (req, res) => {
    try {
        const { userId, gameType, duration, score, metrics } = req.body;
        
        const gameSession = new GameSession({
            userId,
            gameType,
            duration,
            score,
            metrics
        });
        
        await gameSession.save();
        
        // Award badge if applicable
        await awardGameBadges(userId, gameType);
        
        res.json({
            success: true,
            session: {
                id: gameSession._id,
                gameType,
                duration,
                score,
                timestamp: gameSession.timestamp
            }
        });
    } catch (error) {
        console.error('Game session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save game session'
        });
    }
});

async function awardGameBadges(userId, gameType) {
    try {
        const user = await User.findById(userId);
        const sessions = await GameSession.find({ userId, gameType });
        
        // Check for game-specific badges
        if (sessions.length >= 5) {
            const badgeName = `${gameType}_master`;
            const existingBadge = user.badges.find(b => b.name === badgeName);
            
            if (!existingBadge) {
                user.badges.push({
                    name: badgeName,
                    icon: getGameIcon(gameType),
                    earnedAt: new Date()
                });
                await user.save();
            }
        }
    } catch (error) {
        console.error('Badge awarding error:', error);
    }
}

function getGameIcon(gameType) {
    const icons = {
        breathing: '🌀',
        gratitude: '🌼',
        mindful_match: '🎯',
        thought_catcher: '🧠'
    };
    return icons[gameType] || '🎮';
}

// 5. Voice Analysis
app.post('/api/voice/analyze', async (req, res) => {
    try {
        const { userId, audioData, duration, features } = req.body;
        
        // Use deterministic heuristics (or features if provided) for demo analysis
        const analysis = simulateVoiceAnalysis(audioData, features, duration);
        
        const voiceLog = new VoiceLog({
            userId,
            audioUrl: `data:audio/wav;base64,${audioData}`,
            duration,
            analysis: {
                stressScore: analysis.stressScore,
                emotion: analysis.emotion,
                speechRate: analysis.speechRate,
                pitchVariation: analysis.pitchVariation,
                confidence: analysis.confidence
            },
            insights: analysis.insights
        });
        
        await voiceLog.save();
        
        res.json({
            success: true,
            analysis,
            suggestions: getVoiceSuggestions(analysis)
        });
    } catch (error) {
        console.error('Voice analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Voice analysis failed'
        });
    }
});

function simulateVoiceAnalysis(audioData, features = {}, duration = 0) {
    // Deterministic heuristics using provided features when available
    let speechRate = features.speechRate || (140 + Math.random() * 40);
    let pitchVariation = features.pitchVariation || (0.5 + Math.random() * 0.4);
    let confidence = features.confidence || (0.7 + Math.random() * 0.2);

    // Basic stress heuristic
    let stressScore = 4.5;
    let emotion = 'Neutral';

    if (features.rms !== undefined) {
        // RMS roughly correlates with loudness/tension
        if (features.rms > 0.06) stressScore += 2.5;
        if (features.rms < 0.02) emotion = 'Tired';
    }

    if (features.zeroCrossingRate !== undefined) {
        if (features.zeroCrossingRate > 0.2) { stressScore += 2; emotion = 'Anxious'; }
    }

    if (speechRate > 180) { stressScore += 1.5; emotion = 'Anxious'; }
    if (duration >= 8 && duration <= 12 && emotion === 'Tired') { stressScore += 0.8; }

    // Bound and format scores
    stressScore = Math.max(1, Math.min(10, parseFloat(stressScore.toFixed(1))));

    if (stressScore > 7.5) emotion = 'Anxious';
    else if (stressScore >= 6) emotion = 'Tired';
    else if (stressScore < 3) emotion = 'Calm';

    const insights = [];
    if (stressScore > 7) insights.push('High stress detected in voice pattern');
    if (emotion === 'Tired') insights.push('Voice shows signs of fatigue');

    return {
        stressScore,
        emotion,
        speechRate: Math.round(speechRate),
        pitchVariation: parseFloat(pitchVariation.toFixed(2)),
        confidence: parseFloat(confidence.toFixed(2)),
        insights
    };
}

function getVoiceSuggestions(analysis) {
    const suggestions = [];
    
    if (analysis.stressScore > 7) {
        suggestions.push('Try the breathing exercise for 5 minutes');
        suggestions.push('Consider taking a short break');
        suggestions.push('Drink some water and relax your shoulders');
    }
    
    if (analysis.emotion === 'Tired') {
        suggestions.push('Get some rest if possible');
        suggestions.push('Try a quick energy-boosting activity');
    }
    
    return suggestions.length > 0 ? suggestions : ['Your voice sounds balanced. Keep up the good work!'];
}

// 6. Get User Dashboard
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Get today's logs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayLogs = await MoodLog.find({
            userId,
            timestamp: { $gte: today }
        });
        
        // Get recent patterns
        const patterns = await Pattern.find({ userId })
            .sort({ lastUpdated: -1 })
            .limit(3);
        
        // Get recent game sessions
        const recentGames = await GameSession.find({ userId })
            .sort({ timestamp: -1 })
            .limit(2);
        
        // Calculate wellness score
        const wellnessScore = calculateWellnessScore(user, todayLogs);
        
        res.json({
            success: true,
            dashboard: {
                user: {
                    name: user.name,
                    streak: user.streak.current,
                    badges: user.badges
                },
                today: {
                    hasLogged: todayLogs.length > 0,
                    lastMood: todayLogs[0]?.mood || null,
                    lastResponse: todayLogs[0]?.aiResponse || null
                },
                patterns: patterns.map(p => ({
                    type: p.patternType,
                    message: p.insightMessage,
                    suggestion: p.riskLevel === 'HIGH' ? 'Immediate attention recommended' : 'No action needed',
                    confidence: p.confidence || 0,
                    riskLevel: p.riskLevel
                })), 
                recentGames: recentGames.map(g => ({
                    type: g.gameType,
                    duration: g.duration,
                    score: g.score,
                    timestamp: g.timestamp
                })),
                wellnessScore,
                recommendations: generateDailyRecommendations(user, todayLogs)
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dashboard'
        });
    }
});

function calculateWellnessScore(user, todayLogs) {
    let score = 50; // Base score
    
    // Streak bonus
    score += Math.min(user.streak.current * 2, 20);
    
    // Today's mood bonus
    if (todayLogs.length > 0) {
        const todayMood = todayLogs[0].mood;
        if (todayMood >= 7) score += 15;
        else if (todayMood >= 4) score += 5;
    }
    
    // Badge bonus
    score += Math.min(user.badges.length * 3, 15);
    
    // Consistency bonus (simplified)
    const lastWeekLogs = todayLogs.filter(log => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return log.timestamp >= weekAgo;
    });
    
    if (lastWeekLogs.length >= 5) score += 10;
    
    return Math.min(score, 100);
}

function generateDailyRecommendations(user, todayLogs) {
    const recommendations = [];
    const hour = new Date().getHours();
    
    // Morning recommendations
    if (hour < 12 && todayLogs.length === 0) {
        recommendations.push('Start your day with a mood check-in');
        recommendations.push('Set a positive intention for the day');
    }
    
    // Evening recommendations
    if (hour >= 18 && todayLogs.length === 0) {
        recommendations.push('Log your evening mood');
        recommendations.push('Practice gratitude before bed');
    }
    
    // Streak maintenance
    if (user.streak.current >= 3) {
        recommendations.push(`Maintain your ${user.streak.current}-day streak!`);
    }
    
    // Badge encouragement
    if (user.badges.length < 3) {
        recommendations.push('Complete more activities to earn badges');
    }
    
    // Add game recommendations (expanded)
    const games = ['breathing', 'gratitude', 'guided_meditation', 'thought_catcher'];
    const randomGame = games[Math.floor(Math.random() * games.length)];
    recommendations.push(`Try the ${randomGame.replace('_', ' ')} game today`);
    
    return recommendations;
}

// 7. Health Check
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
        
        res.json({
            status: 'healthy',
            timestamp: new Date(),
            database: dbStatus,
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// 8. Export Data (for user download)
app.get('/api/export/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        const moodLogs = await MoodLog.find({ userId });
        const voiceLogs = await VoiceLog.find({ userId });
        const gameSessions = await GameSession.find({ userId });
        
        const exportData = {
            user: {
                name: user.name,
                age: user.age,
                createdAt: user.createdAt,
                streak: user.streak,
                badges: user.badges
            },
            moodLogs: moodLogs.map(log => ({
                mood: log.mood,
                moodLabel: log.moodLabel,
                notes: log.notes,
                aiResponse: log.aiResponse,
                timestamp: log.timestamp
            })),
            voiceLogs: voiceLogs.map(log => ({
                duration: log.duration,
                analysis: log.analysis,
                timestamp: log.timestamp
            })),
            gameSessions: gameSessions.map(session => ({
                gameType: session.gameType,
                duration: session.duration,
                score: session.score,
                timestamp: session.timestamp
            })),
            exportedAt: new Date()
        };
        
        res.json({
            success: true,
            data: exportData,
            format: 'JSON'
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            error: 'Export failed'
        });
    }
});

// 9. Reset User Data (for testing)
app.post('/api/reset/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        await MoodLog.deleteMany({ userId });
        await VoiceLog.deleteMany({ userId });
        await GameSession.deleteMany({ userId });
        await Pattern.deleteMany({ userId });
        
        await User.findByIdAndUpdate(userId, {
            $set: {
                streak: { current: 0, longest: 0, lastLogin: null },
                badges: []
            }
        });
        
        res.json({
            success: true,
            message: 'User data reset successfully'
        });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Reset failed'
        });
    }
});

// ========== ERROR HANDLING ==========
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 MindShield backend running on port ${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   - Health: http://localhost:${PORT}/api/health`);
    console.log(`   - Register: POST http://localhost:${PORT}/api/register`);
    console.log(`   - Log Mood: POST http://localhost:${PORT}/api/mood`);
    console.log(`   - Get Insights: GET http://localhost:${PORT}/api/insights/:userId`);
});