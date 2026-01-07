import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import api, { 
    registerUser, 
    logMood, 
    getInsights, 
    analyzeVoice, 
    saveGameSession,
    getUserDashboard 
} from './services/api';

// Constants moved outside component to prevent recreation on every render
const moodOptions = [
    { emoji: '😊', label: 'Excellent', value: 9, color: '#4CAF50' },
    { emoji: '🙂', label: 'Very Good', value: 8, color: '#8BC34A' },
    { emoji: '😌', label: 'Good', value: 7, color: '#CDDC39' },
    { emoji: '😐', label: 'Neutral', value: 5, color: '#FFC107' },
    { emoji: '😔', label: 'Low', value: 3, color: '#FF9800' },
    { emoji: '😢', label: 'Very Low', value: 2, color: '#FF5722' },
    { emoji: '😭', label: 'Critical', value: 1, color: '#F44336' }
];

const onboardingQuestions = [
    {
        id: 'q1',
        question: "When I feel rushed, I usually...",
        options: ['Work faster', 'Take a pause', 'Get overwhelmed', 'Make a list', 'Ask for help']
    },
    {
        id: 'q2',
        question: "When I'm mentally tired, I tend to...",
        options: ['Rest', 'Push through', 'Get irritable', 'Seek quiet', 'Take a walk']
    },
    {
        id: 'q3',
        question: "During restlessness, I often...",
        options: ['Fidget', 'Go for a walk', 'Distract myself', 'Try to relax', 'Clean/organize']
    },
    {
        id: 'q4',
        question: "When overwhelmed, my first instinct is to...",
        options: ['Withdraw', 'Seek help', 'Make a plan', 'Breathe deeply', 'Take a break']
    },
    {
        id: 'q5',
        question: "To calm down, I typically...",
        options: ['Listen to music', 'Breathe', 'Talk to someone', 'Be alone', 'Exercise']
    }
];

function App() {
    const [step, setStep] = useState('onboarding');
    const [currentView, setCurrentView] = useState('dashboard');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [responses, setResponses] = useState({});
    
    // Mood states
    const [currentMood, setCurrentMood] = useState(null);
    const [aiResponse, setAiResponse] = useState('');
    const [stressPrediction, setStressPrediction] = useState(null);
    
    // Game states
    const [currentGame, setCurrentGame] = useState(null);
    const [breathingPhase, setBreathingPhase] = useState('INHALE');
    const [bubbleSize, setBubbleSize] = useState(100);
    const [gameTime, setGameTime] = useState(0);
    const [gratitudeItems, setGratitudeItems] = useState([]);
    const [newGratitude, setNewGratitude] = useState('');
    
    // Dashboard states
    const [dashboardData, setDashboardData] = useState(null);
    const [patterns, setPatterns] = useState([]);
    const [wellnessScore, setWellnessScore] = useState(0);
    const [insightsData, setInsightsData] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [notification, setNotification] = useState(null);
    
    // Voice states
    const [isRecording, setIsRecording] = useState(false);
    const [voiceAnalysis, setVoiceAnalysis] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    
    const recordingMax = 10; // seconds
    
    // Refs for cleanup
    const breathingIntervalRef = useRef(null);
    const breathingTimerRef = useRef(null);
    const gratitudeTimerRef = useRef(null);
    const guidedMedTimerRef = useRef(null);
    const thoughtTimerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const recordingTimeoutRef = useRef(null);

    // Initialize
    useEffect(() => {
        // Check for saved user in localStorage
        const savedUser = localStorage.getItem('mindshield_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setUserData(user);
                setStep('app');
                loadDashboard(user.id);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('mindshield_user');
            }
        }
        
        // Check backend health
        checkBackendHealth();
        
        // Cleanup function
        return () => {
            cleanupIntervals();
        };
    }, []);

    const cleanupIntervals = () => {
        // Clean all intervals and timeouts
        if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
        if (breathingTimerRef.current) clearInterval(breathingTimerRef.current);
        if (gratitudeTimerRef.current) clearInterval(gratitudeTimerRef.current);
        if (guidedMedTimerRef.current) clearInterval(guidedMedTimerRef.current);
        if (thoughtTimerRef.current) clearInterval(thoughtTimerRef.current);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
        
        // Stop media recorder if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const [backendOnline, setBackendOnline] = useState(false);

    const checkBackendHealth = async () => {
        try {
            await api.get('/health');
            if (!backendOnline) {
                setBackendOnline(true);
                showNotification('✅ Backend connected successfully', 'success');
            }
            return true;
        } catch (error) {
            if (backendOnline) setBackendOnline(false);
            console.error('❌ Backend connection failed');
            showNotification('⚠️ Backend connection failed - running in demo mode', 'warning');
            return false;
        }
    }; 

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Fetch insights when user opens Insights view
    const fetchInsights = async (userId) => {
        setLoading(true);
        try {
            // Check backend health first to show helpful messages
            try {
                const health = await api.get('/health');
                if (health && health.data && health.data.database === 'disconnected') {
                    showNotification('Server is running but database is disconnected — insights may be limited', 'warning');
                }
            } catch (hErr) {
                // ignore health errors - we'll fall back below
            }

            const response = await getInsights(userId);
            setInsightsData(response.data.insights);
            setPatterns(response.data.insights.patterns || []);
        } catch (error) {
            console.error('Fetch insights error:', error, error?.response?.data);

            // Determine if database is the likely cause
            let healthStateMsg = '';
            try {
                const health = await api.get('/health');
                if (health && health.data) {
                    healthStateMsg = ` (database: ${health.data.database || 'unknown'})`;
                }
            } catch (hErr) {
                healthStateMsg = ' (backend unavailable)';
            }

            showNotification(`Failed to load insights from server${healthStateMsg} — using local data if available`, 'warning');

            // Fallback to local logs (if any)
            try {
                const localKey = 'mindshield_local_logs';
                const localLogs = JSON.parse(localStorage.getItem(localKey) || '[]').filter(l => l.userId === userId);

                if (localLogs.length > 0) {
                    const totalLogs = localLogs.length;
                    const avgMood = (localLogs.reduce((s, l) => s + (l.mood || 0), 0) / totalLogs) || 0;
                    const moodDistribution = {
                        high: localLogs.filter(l => l.mood >= 7).length,
                        medium: localLogs.filter(l => l.mood >= 4 && l.mood < 7).length,
                        low: localLogs.filter(l => l.mood < 4).length
                    };

                    const localInsights = {
                        stats: {
                            totalLogs,
                            avgMood: avgMood.toFixed ? avgMood.toFixed(1) : avgMood,
                            weeklyAvg: avgMood.toFixed ? avgMood.toFixed(1) : avgMood,
                            moodDistribution,
                            voiceChecks: 0,
                            consistency: 0
                        },
                        patterns: [{ type: 'local', message: 'Local data only', suggestion: 'Sync with server for richer insights', confidence: 0.1 }],
                        stressPrediction: localLogs.slice(-1)[0].stressPrediction || null,
                        recentLogs: localLogs.slice(-5).reverse()
                    };

                    setInsightsData(localInsights);
                    setPatterns(localInsights.patterns || []);
                } else {
                    showNotification('No local data available for insights.', 'info');
                }
            } catch (localError) {
                console.error('Local insights fallback failed:', localError);
                showNotification('Unable to compute local insights.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentView === 'insights' && userData) {
            fetchInsights(userData.id);
        }
    }, [currentView, userData]);

    // Sync any local data (mood logs and voice logs) to server when backend is available
    const syncLocalData = async () => {
        try {
            const online = await checkBackendHealth();
            if (!online) return;

            // If user is local, attempt to register on backend
            if (userData && String(userData.id).startsWith('local-')) {
                try {
                    const reg = await registerUser({ name: userData.name || 'user', age: userData.age || 30, email: userData.email || undefined, responses: {} });
                    if (reg && reg.data && reg.data.user) {
                        const realUser = { id: reg.data.user.id, name: reg.data.user.name, age: reg.data.user.age, streak: reg.data.user.streak || 0 };
                        setUserData(realUser);
                        localStorage.setItem('mindshield_user', JSON.stringify(realUser));
                        showNotification('Local profile synced to server.', 'success');
                    }
                } catch (err) {
                    console.warn('Could not sync user profile yet:', err);
                }
            }

            const localMoodKey = 'mindshield_local_logs';
            const localLogs = JSON.parse(localStorage.getItem(localMoodKey) || '[]');
            if (localLogs.length > 0 && userData) {
                const remaining = [];
                for (const log of localLogs) {
                    try {
                        const res = await logMood({ userId: userData.id, mood: log.mood, notes: log.notes || '', context: log.context || {} });
                        // apply server response updates
                        if (res && res.data) {
                            setAiResponse(res.data.log.aiResponse);
                            setStressPrediction(res.data.log.stressPrediction);
                            if (res.data.patterns) setPatterns(res.data.patterns);
                        }
                    } catch (err) {
                        console.warn('Failed to sync a local mood log, will retry later', err);
                        remaining.push(log);
                    }
                }
                localStorage.setItem(localMoodKey, JSON.stringify(remaining));
                if (remaining.length === 0) {
                    showNotification('All local mood logs synced.', 'success');
                }
                loadDashboard(userData.id);
            }

            const localVoiceKey = 'mindshield_local_voice';
            const localVoices = JSON.parse(localStorage.getItem(localVoiceKey) || '[]');
            if (localVoices.length > 0 && userData) {
                const remainingVoice = [];
                for (const v of localVoices) {
                    try {
                        const res = await analyzeVoice({ userId: userData.id, audioData: v.audioData, duration: v.duration, features: v.features });
                        if (res && res.data) {
                            setVoiceAnalysis(res.data.analysis || res.data);
                        }
                    } catch (err) {
                        console.warn('Failed to sync a local voice log, will retry later', err);
                        remainingVoice.push(v);
                    }
                }
                localStorage.setItem(localVoiceKey, JSON.stringify(remainingVoice));
                if (remainingVoice.length === 0) showNotification('All local voice logs synced.', 'success');
            }

            // Refresh insights and dashboard
            if (userData) {
                fetchInsights(userData.id);
                loadDashboard(userData.id);
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    };

    // Poll backend health and sync local data when available
    useEffect(() => {
        let interval = setInterval(async () => {
            const wasOnline = backendOnline;
            const isOnline = await checkBackendHealth();
            if (!wasOnline && isOnline) {
                // Just became online
                syncLocalData();
            }
        }, 30000); // check every 30s

        // Attempt an initial sync if online
        if (backendOnline) syncLocalData();

        return () => clearInterval(interval);
    }, [backendOnline, userData]);

    // Handle user registration
    const handleRegister = async () => {
        if (!name.trim() || !String(age).trim()) {
            showNotification('Please enter your name and age', 'error');
            return;
        }
        
        const ageNum = parseInt(age);
        if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
            showNotification('Age must be between 13 and 120', 'error');
            return;
        }
        
        setLoading(true);

        // Optimistic local profile so the UI proceeds even if backend is down
        const tempId = `local-${Date.now()}`;
        const optimisticUser = { id: tempId, name: name.trim(), age: ageNum, streak: 0 };
        setUserData(optimisticUser);
        localStorage.setItem('mindshield_user', JSON.stringify(optimisticUser));
        setStep('app');
        loadDashboard(optimisticUser.id);
        showNotification(`Welcome to MindShield, ${name}! 🎉`, 'success');

        try {
            const response = await registerUser({
                name: name.trim(),
                age: ageNum,
                email: email.trim() || undefined,
                responses
            });

            // If backend returns a real user, replace the optimistic profile
            if (response && response.data && response.data.user) {
                const user = {
                    id: response.data.user.id,
                    name: response.data.user.name,
                    age: response.data.user.age,
                    streak: response.data.user.streak || 0
                };
                setUserData(user);
                localStorage.setItem('mindshield_user', JSON.stringify(user));
                loadDashboard(user.id);
                showNotification(`Profile synced with server. Welcome, ${user.name}! 🎉`, 'success');
            }
        } catch (error) {
            console.warn('Registration error (backend):', error);
            showNotification('Could not reach server — your profile is local and will sync when the server is available.', 'warning');
        } finally {
            setLoading(false);
        }
    };

    // Load dashboard data
    const loadDashboard = async (userId) => {
        setLoading(true);
        try {
            const response = await getUserDashboard(userId);
            setDashboardData(response.data.dashboard);
            setPatterns(response.data.dashboard.patterns || []);
            setWellnessScore(response.data.dashboard.wellnessScore || 0);
        } catch (error) {
            console.error('Dashboard load error:', error);
            // Fallback to demo data
            setDashboardData({
                user: { streak: 0 },
                today: { lastMood: '--' },
                recentGames: [],
                recommendations: ['Try a breathing exercise', 'Log your mood for the day']
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle mood logging
    const handleMoodLog = async (moodValue) => {
        if (!userData) {
            showNotification('Please log in first', 'error');
            return;
        }
        
        setCurrentMood(moodValue);
        setLoading(true);
        
        const moodData = {
            userId: userData.id,
            mood: moodValue,
            notes: '',
            context: {
                timeOfDay: new Date().getHours(),
                tags: []
            }
        };

        try {
            const response = await logMood(moodData);

            setAiResponse(response.data.log.aiResponse);
            setStressPrediction(response.data.log.stressPrediction);

            // Update patterns
            if (response.data.patterns) {
                setPatterns(response.data.patterns);
            }

            // Update user streak
            if (response.data.user) {
                const updatedUserData = {
                    ...userData,
                    streak: response.data.user.streak
                };
                setUserData(updatedUserData);
                localStorage.setItem('mindshield_user', JSON.stringify(updatedUserData));
            }

            // Reload dashboard
            loadDashboard(userData.id);

            // Show notification if stress prediction is high
            if (response.data.log.stressPrediction?.riskLevel === 'HIGH') {
                setTimeout(() => {
                    setModalContent({
                        title: '⚠️ Stress Alert',
                        body: `${response.data.log.stressPrediction.prediction}\n\nSuggestion: ${response.data.log.stressPrediction.suggestions?.[0] || 'Try a calming activity'}`
                    });
                }, 1000);
            }

            showNotification('Mood logged successfully!', 'success');
        } catch (error) {
            console.error('Mood logging error:', error);

            // Fallback: save mood locally so the user action is not lost
            try {
                const localKey = 'mindshield_local_logs';
                const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                const fallbackLog = {
                    id: `local-${Date.now()}`,
                    userId: userData.id,
                    mood: moodData.mood,
                    moodLabel: moodData.mood >= 7 ? 'Good' : (moodData.mood <= 3 ? 'Low' : 'Neutral'),
                    aiResponse: `Thanks for checking in. Saved locally — we'll sync when the server is available.`,
                    stressPrediction: (moodData.mood <= 3) ? { riskLevel: 'HIGH', prediction: 'High stress likely' } : (moodData.mood <= 4 ? { riskLevel: 'MEDIUM', prediction: 'Moderate stress' } : { riskLevel: 'LOW', prediction: 'Low stress' }),
                    timestamp: new Date().toISOString()
                };
                existing.push(fallbackLog);
                localStorage.setItem(localKey, JSON.stringify(existing));

                // Apply immediate UI updates
                setAiResponse(fallbackLog.aiResponse);
                setStressPrediction(fallbackLog.stressPrediction);
                setPatterns(prev => prev.concat([{ type: 'local', message: 'Local mood log saved', confidence: 0.1 }]));

                // Adjust local user streak heuristically
                const updatedUserData = { ...userData, streak: (userData.streak || 0) + 1 };
                setUserData(updatedUserData);
                localStorage.setItem('mindshield_user', JSON.stringify(updatedUserData));

                loadDashboard(userData.id);

                showNotification('Mood logged locally — will sync when server is available.', 'warning');
            } catch (localError) {
                console.error('Local fallback failed:', localError);
                showNotification('Failed to log mood. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Start breathing game
    const startBreathingGame = () => {
        cleanupIntervals(); // Clean any existing intervals
        
        setCurrentGame('breathing');
        setBreathingPhase('INHALE');
        setBubbleSize(100);
        setGameTime(120); // 2 minutes
        
        let phaseIndex = 0;
        const phases = [
            { name: 'INHALE', duration: 4000, targetSize: 200, color: '#4CAF50' },
            { name: 'HOLD', duration: 4000, targetSize: 200, color: '#2196F3' },
            { name: 'EXHALE', duration: 4000, targetSize: 100, color: '#FF9800' }
        ];
        
        const cyclePhase = () => {
            const phase = phases[phaseIndex];
            setBreathingPhase(phase.name);
            
            // Animate bubble
            const steps = 40;
            let currentStep = 0;
            
            const animate = setInterval(() => {
                setBubbleSize(prev => {
                    const stepSize = (phase.targetSize - prev) / steps;
                    const newSize = prev + stepSize;
                    currentStep++;

                    if (currentStep >= steps) {
                        clearInterval(animate);
                        return phase.targetSize;
                    }

                    return newSize;
                });
            }, phase.duration / steps);

            // Clean up animation interval
            setTimeout(() => clearInterval(animate), phase.duration);
            
            // Move to next phase
            phaseIndex = (phaseIndex + 1) % phases.length;
        };
        
        // Start cycling
        cyclePhase();
        breathingIntervalRef.current = setInterval(cyclePhase, 4000);
        
        // Timer
        breathingTimerRef.current = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 1) {
                    finishBreathingGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const finishBreathingGame = async () => {
        cleanupIntervals();
        
        try {
            await saveGameSession({
                userId: userData.id,
                gameType: 'breathing',
                duration: 120,
                score: 100,
                metrics: {
                    breathsCompleted: Math.floor(120 / 12), // 12 seconds per cycle
                    stressBefore: stressPrediction?.confidence || 0,
                    stressAfter: Math.max(0, (stressPrediction?.confidence || 0) - 0.3)
                }
            });
            
            showNotification('🎉 Breathing exercise completed! You did great!', 'success');
            setCurrentGame(null);
        } catch (error) {
            console.error('Game save error:', error);
            showNotification('Exercise completed! (Save failed)', 'warning');
            setCurrentGame(null);
        }
    };

    // Start gratitude game
    const startGratitudeGame = () => {
        cleanupIntervals();
        
        setCurrentGame('gratitude');
        setGratitudeItems([]);
        setGameTime(180); // 3 minutes
        
        gratitudeTimerRef.current = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 1) {
                    finishGratitudeGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const addGratitudeItem = () => {
        if (newGratitude.trim()) {
            const flowers = ['🌼', '🌸', '🌺', '🌻', '🌹', '💐', '🌷', '🥀'];
            const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F'];
            
            setGratitudeItems(prev => [...prev, {
                id: Date.now() + Math.random(),
                text: newGratitude.trim(),
                flower: flowers[Math.floor(Math.random() * flowers.length)],
                color: colors[Math.floor(Math.random() * colors.length)]
            }]);
            
            setNewGratitude('');
        }
    };

    const finishGratitudeGame = async () => {
        cleanupIntervals();
        
        try {
            await saveGameSession({
                userId: userData.id,
                gameType: 'gratitude',
                duration: 180,
                score: gratitudeItems.length * 10,
                metrics: {
                    itemsAdded: gratitudeItems.length,
                    completion: Math.min((gratitudeItems.length / 5) * 100, 100)
                }
            });
            
            showNotification(`🌺 Beautiful! You planted ${gratitudeItems.length} flowers of gratitude!`, 'success');
            setCurrentGame(null);
        } catch (error) {
            console.error('Game save error:', error);
            showNotification('Gratitude exercise completed!', 'success');
            setCurrentGame(null);
        }
    };

    // Start guided meditation
    const startGuidedMeditation = () => {
        cleanupIntervals();
        
        setCurrentGame('guided_meditation');
        setGameTime(300); // 5 minutes

        guidedMedTimerRef.current = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 1) {
                    finishGuidedMeditation();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const finishGuidedMeditation = async () => {
        cleanupIntervals();
        
        try {
            await saveGameSession({
                userId: userData.id,
                gameType: 'guided_meditation',
                duration: 300,
                score: 100,
                metrics: { completion: 100 }
            });

            showNotification('🧘 Guided meditation complete – well done!', 'success');
            setCurrentGame(null);
        } catch (error) {
            console.error('Game save error:', error);
            showNotification('Meditation completed!', 'success');
            setCurrentGame(null);
        }
    };

    // Start Thought Catcher
    const startThoughtCatcher = () => {
        cleanupIntervals();
        
        setCurrentGame('thought_catcher');
        setGameTime(120); // 2 minutes
        setGratitudeItems([]);

        thoughtTimerRef.current = setInterval(() => {
            setGameTime(prev => {
                if (prev <= 1) {
                    finishThoughtCatcher();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const finishThoughtCatcher = async () => {
        cleanupIntervals();
        
        try {
            await saveGameSession({
                userId: userData.id,
                gameType: 'thought_catcher',
                duration: 120,
                score: gratitudeItems.length * 10,
                metrics: { itemsCaptured: gratitudeItems.length }
            });

            showNotification(`💡 Great job reframing ${gratitudeItems.length} thoughts!`, 'success');
            setCurrentGame(null);
            setGratitudeItems([]);
        } catch (error) {
            console.error('Game save error:', error);
            showNotification('Thought exercise completed!', 'success');
            setCurrentGame(null);
        }
    };

    // Handle voice recording
    const handleVoiceRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotification('Microphone access not supported', 'error');
            return;
        }

        setIsRecording(true);
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                setIsRecording(false);
                setRecordingTime(0);
                stream.getTracks().forEach(track => track.stop());

                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
                if (recordingTimeoutRef.current) {
                    clearTimeout(recordingTimeoutRef.current);
                }

                const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                
                if (blob.size === 0) {
                    showNotification('No audio recorded', 'error');
                    return;
                }

                // Extract features first
                const features = await computeAudioFeatures(blob);

                // Convert to base64
                const base64Data = await blobToBase64(blob);
                const payload = {
                    userId: userData?.id || `local-${Date.now()}`,
                    audioData: base64Data.split(',')[1],
                    duration: Math.min(recordingMax, recordingTime),
                    features
                };

                try {
                    const response = await analyzeVoice(payload);

                    setVoiceAnalysis(response.data.analysis || response.data);
                    showNotification('Voice analysis complete!', 'success');
                } catch (error) {
                    console.error('Voice analysis error:', error);

                    // Fallback to local analysis and save locally
                    try {
                        const localAnalysis = localAnalyzeVoice(features, payload.duration);
                        setVoiceAnalysis(localAnalysis);

                        const localKey = 'mindshield_local_voice';
                        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                        existing.push({
                            id: `local-${Date.now()}`,
                            userId: payload.userId,
                            audioData: payload.audioData,
                            duration: payload.duration,
                            features,
                            analysis: localAnalysis,
                            timestamp: new Date().toISOString()
                        });
                        localStorage.setItem(localKey, JSON.stringify(existing));

                        showNotification('Voice analysis completed locally — will sync when server is available.', 'warning');
                    } catch (localErr) {
                        console.error('Local voice fallback failed:', localErr);
                        showNotification('Voice analysis failed. Please try again.', 'error');
                    }
                }
            };

            // Start recording timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= recordingMax) {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                        return recordingMax;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Auto-stop after max time
            recordingTimeoutRef.current = setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, recordingMax * 1000);

            mediaRecorder.start();

        } catch (error) {
            console.error('Recording error:', error);
            setIsRecording(false);
            setRecordingTime(0);
            
            if (error.name === 'NotAllowedError') {
                showNotification('Microphone access denied. Please allow microphone access.', 'error');
            } else {
                showNotification('Unable to access microphone.', 'error');
            }
        }
    };

    // Convert Blob to base64
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Compute basic audio features (RMS and zero-crossing rate)
    const computeAudioFeatures = async (blob) => {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return {};
            const audioCtx = new AudioCtx();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);
            let sumSq = 0;
            let zeroCross = 0;
            for (let i = 0; i < channelData.length; i++) {
                const s = channelData[i];
                sumSq += s * s;
                if (i > 0 && ((channelData[i - 1] >= 0) !== (s >= 0))) zeroCross++;
            }
            const rms = Math.sqrt(sumSq / channelData.length);
            const zcr = zeroCross / channelData.length;
            if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close();
            return { rms, zeroCrossingRate: zcr };
        } catch (err) {
            console.warn('Audio feature extraction failed', err);
            return {};
        }
    };

    // Local deterministic voice analysis fallback (mirrors backend heuristics)
    const localAnalyzeVoice = (features = {}, duration = 0) => {
        let speechRate = features.speechRate || 160;
        let pitchVariation = features.pitchVariation || 0.5;
        let confidence = features.confidence || 0.85;

        let stressScore = 4.5;
        let emotion = 'Neutral';

        if (features.rms !== undefined) {
            if (features.rms > 0.06) stressScore += 2.5;
            if (features.rms < 0.02) emotion = 'Tired';
        }

        if (features.zeroCrossingRate !== undefined) {
            if (features.zeroCrossingRate > 0.2) { stressScore += 2; emotion = 'Anxious'; }
        }

        // Duration-based tweak
        if (duration >= 8 && stressScore > 6) stressScore -= 0.5; // longer samples can give more stable low scores

        const insights = [];
        if (stressScore >= 7) insights.push('High vocal tension detected');
        else if (stressScore >= 5) insights.push('Moderate vocal stress signals');
        else insights.push('Voice seems relatively calm');

        return {
            stressScore: Math.min(10, stressScore),
            emotion,
            speechRate,
            pitchVariation,
            confidence,
            insights
        };
    }; 

    // Logout
    const handleLogout = () => {
        cleanupIntervals();
        localStorage.removeItem('mindshield_user');
        setUserData(null);
        setStep('onboarding');
        setCurrentView('dashboard');
        showNotification('Logged out successfully', 'info');
    };

    // Get time of day for greeting
    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 18) return 'Afternoon';
        return 'Evening';
    };

    // Get bubble color for breathing game
    const getBubbleColor = (phase) => {
        switch(phase) {
            case 'INHALE': return '#4CAF50';
            case 'HOLD': return '#2196F3';
            case 'EXHALE': return '#FF9800';
            default: return '#4CAF50';
        }
    };

    // Onboarding Screen
    if (step === 'onboarding') {
        return (
            <div className="onboarding">
                {/* Floating decorative elements */}
                <div className="floating-element" aria-hidden="true" role="presentation"></div>
                <div className="floating-element" aria-hidden="true" role="presentation"></div>
                <div className="floating-element" aria-hidden="true" role="presentation"></div>
                
                {/* Left Side - Form */}
                <div className="onboarding-card">
                    <div className="onboarding-header">
                        <h1 className="app-title">MindShield</h1>
                        <p className="app-subtitle">AI-Powered Mental Wellness Companion</p>
                    </div>
                    
                    <div className="onboarding-step active">
                        <div className="step-header">
                            <h2>Welcome to MindShield</h2>
                            <p className="step-description">
                                Let's create your personalized wellness profile. This helps us provide better insights and support.
                            </p>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="name">
                                Your Name <span className="required-star">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="form-input"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="age">
                                Your Age <span className="required-star">*</span>
                            </label>
                            <input
                                id="age"
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="Enter your age"
                                className="form-input"
                                min="13"
                                max="120"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="email">Email (Optional)</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="form-input"
                            />
                        </div>
                        
                        {/* Quick Questions Section */}
                        <div className="questions-section">
                            <div className="questions-header">
                                <h3>Quick Questions</h3>
                                <p className="helper-text">These help personalize your experience</p>
                            </div>
                            
                            <div className="question-grid">
                                {onboardingQuestions.map((question) => (
                                    <div key={question.id} className="question-item">
                                        <label>{question.question}</label>
                                        <select
                                            className="form-input"
                                            onChange={(e) => setResponses({
                                                ...responses,
                                                [question.id]: e.target.value
                                            })}
                                            value={responses[question.id] || ''}
                                        >
                                            <option value="">Select an option</option>
                                            {question.options.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Submit Section */}
                        <div className="submit-section">
                            <button
                                type="button"
                                onClick={handleRegister}
                                className="btn-submit"
                                disabled={!name.trim() || !String(age).trim() || loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Creating Profile...
                                    </>
                                ) : (
                                    <>
                                        Start Your Wellness Journey
                                        <span style={{ fontSize: '1.2rem' }}>✨</span>
                                    </>
                                )}
                            </button>
                            
                            <div className="privacy-notice">
                                <p>
                                    <span className="lock-icon">🔒</span>
                                    Your data is encrypted and private. We never share personal information.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Side - Hero (decorative) */}
                <div className="onboarding-hero" aria-hidden="true" role="presentation">
                    <div className="hero-content">
                        <h2>Find calm. Build healthy habits.</h2>
                        <p>
                            Discover patterns, try short activities, and track progress — all in one gentle, privacy-first app.
                        </p>
                        
                        <div className="hero-stats">
                            <div className="hero-stat">
                                <span className="hero-stat-value">5+</span>
                                <span className="hero-stat-label">Daily Practices</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-value">Patterns</span>
                                <span className="hero-stat-label">Auto-detected</span>
                            </div>
                        </div>
                        
                        <div className="progress-indicator">
                            <div className="progress-dot active"></div>
                            <div className="progress-dot"></div>
                            <div className="progress-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main App Screen
    return (
        <div className="app-container">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification toast-${notification.type}`}>
                    {notification.message}
                    <button 
                        className="notification-close"
                        onClick={() => setNotification(null)}
                    >
                        ×
                    </button>
                </div>
            )}
            
            {/* Header */}
            <header className="app-header">
                <div className="header-left">
                    <h1 className="app-title">🧠 MindShield</h1>
                    {userData && (
                        <div className="user-welcome">
                            <span className="welcome-text">Welcome back,</span>
                            <span className="user-name">{userData.name}!</span>
                        </div>
                    )}
                </div>
                
                <div className="header-right">
                    {userData && (
                        <div className="user-stats">
                            <div className="streak-badge">
                                <span className="streak-icon">🔥</span>
                                <span className="streak-count">{userData.streak || 0} days</span>
                            </div>
                            <div className="wellness-score">
                                <div className="score-circle">
                                    <span className="score-value">{wellnessScore}</span>
                                </div>
                                <span className="score-label">Wellness</span>
                            </div>
                            <button
                                className="btn-logout"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            {/* Navigation */}
            <nav className="app-navigation">
                <button
                    className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentView('dashboard')}
                >
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Dashboard</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'mood' ? 'active' : ''}`}
                    onClick={() => setCurrentView('mood')}
                >
                    <span className="nav-icon">😊</span>
                    <span className="nav-label">Mood Log</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'games' ? 'active' : ''}`}
                    onClick={() => setCurrentView('games')}
                >
                    <span className="nav-icon">🎮</span>
                    <span className="nav-label">Activities</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'insights' ? 'active' : ''}`}
                    onClick={() => setCurrentView('insights')}
                >
                    <span className="nav-icon">📈</span>
                    <span className="nav-label">Insights</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'voice' ? 'active' : ''}`}
                    onClick={() => setCurrentView('voice')}
                >
                    <span className="nav-icon">🎤</span>
                    <span className="nav-label">Voice Check</span>
                </button>
            </nav>
            
            {/* Main Content */}
            <main className="main-content">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading your wellness data...</p>
                    </div>
                ) : (
                    <>
                        {/* Dashboard View */}
                        {currentView === 'dashboard' && (
                            <div className="dashboard-view">
                                <div className="welcome-card">
                                    <h2>Good {getTimeOfDay()}!</h2>
                                    <p>Here's your wellness overview for today.</p>
                                    
                                    <div className="quick-actions">
                                        <button
                                            className="action-btn primary"
                                            onClick={() => setCurrentView('mood')}
                                        >
                                            😊 Log Today's Mood
                                        </button>
                                        <button
                                            className="action-btn secondary"
                                            onClick={() => setCurrentView('voice')}
                                        >
                                            🎤 Voice Check-in
                                        </button>
                                        <button
                                            className="action-btn tertiary"
                                            onClick={() => setCurrentView('games')}
                                        >
                                            🎮 Try an Activity
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-icon">📅</div>
                                        <div className="stat-value">{userData?.streak || 0}</div>
                                        <div className="stat-label">Day Streak</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">😊</div>
                                        <div className="stat-value">{dashboardData?.today?.lastMood || '--'}</div>
                                        <div className="stat-label">Today's Mood</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🎮</div>
                                        <div className="stat-value">{dashboardData?.recentGames?.length || 0}</div>
                                        <div className="stat-label">Recent Activities</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📊</div>
                                        <div className="stat-value">{patterns.length}</div>
                                        <div className="stat-label">Patterns Found</div>
                                    </div>
                                </div>
                                
                                {/* Daily Recommendations */}
                                {dashboardData?.recommendations && dashboardData.recommendations.length > 0 && (
                                    <div className="recommendations-card">
                                        <h3>💡 Daily Recommendations</h3>
                                        <ul className="recommendations-list">
                                            {dashboardData.recommendations.slice(0, 3).map((rec, index) => (
                                                <li key={index}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {/* Patterns */}
                                {patterns.length > 0 && (
                                    <div className="patterns-card">
                                        <h3>🔍 Detected Patterns</h3>
                                        <div className="patterns-list">
                                            {patterns.slice(0, 2).map((pattern, index) => (
                                                <div key={index} className="pattern-item">
                                                    <div className="pattern-icon">📊</div>
                                                    <div className="pattern-content">
                                                        <h4>{pattern.message || pattern.insightMessage || 'Pattern detected'}</h4>
                                                        <p className="pattern-suggestion">
                                                            💡 {pattern.suggestion || (pattern.riskLevel === 'HIGH' ? 'Consider proactive stress management' : 'Keep observing this behavior')}
                                                            {pattern.riskLevel === 'HIGH' && ' ⚠️'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))} 
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Mood Log View */}
                        {currentView === 'mood' && (
                            <div className="mood-view">
                                <div className="mood-header">
                                    <h2>How are you feeling right now?</h2>
                                    <p className="subtitle">Select the mood that best represents your current state</p>
                                </div>
                                
                                <div className="mood-options">
                                    {moodOptions.map(mood => (
                                        <button
                                            key={mood.value}
                                            className={`mood-option ${currentMood === mood.value ? 'selected' : ''}`}
                                            style={{ backgroundColor: mood.color }}
                                            onClick={() => handleMoodLog(mood.value)}
                                            disabled={loading || !userData}
                                            title={`${mood.label} (${mood.value}/10)`}
                                        >
                                            <span className="mood-emoji">{mood.emoji}</span>
                                            <span className="mood-label">{mood.label}</span>
                                            <span className="mood-value">{mood.value}/10</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {!userData && (
                                    <div className="no-user-message">
                                        <p>Please complete onboarding to log your mood.</p>
                                    </div>
                                )}
                                
                                {aiResponse && (
                                    <div className="ai-response-card">
                                        <div className="ai-header">
                                            <span className="ai-icon">🤖</span>
                                            <h3>AI Companion Response</h3>
                                        </div>
                                        <p className="ai-message">{aiResponse}</p>
                                        
                                        {stressPrediction && (
                                            <div className="stress-alert">
                                                <div className="alert-header">
                                                    <span className="alert-icon">⚠️</span>
                                                    <h4>Stress Prediction</h4>
                                                </div>
                                                <p className="alert-message">{stressPrediction.prediction}</p>
                                                <div className="alert-suggestions">
                                                    <p>Suggestions:</p>
                                                    <ul>
                                                        {(stressPrediction.suggestions || []).slice(0, 2).map((suggestion, idx) => (
                                                            <li key={idx}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Games View */}
                        {currentView === 'games' && (
                            <div className="games-view">
                                <h2>Calming Activities</h2>
                                <p className="subtitle">Play these activities when you need a mental break</p>
                                
                                {currentGame === null ? (
                                    <div className="games-grid">
                                        <div className="game-card">
                                            <div className="game-icon">🌀</div>
                                            <h3>Breathing Bubble</h3>
                                            <p>Follow the expanding bubble to regulate breathing using 4-7-8 technique</p>
                                            <div className="game-meta">
                                                <span className="game-duration">⏱️ 2 minutes</span>
                                                <span className="game-benefit">💆 High stress relief</span>
                                            </div>
                                            <button
                                                className="btn-play"
                                                onClick={startBreathingGame}
                                                disabled={!userData}
                                            >
                                                Start Breathing Exercise
                                            </button>
                                        </div>
                                        
                                        <div className="game-card">
                                            <div className="game-icon">🌼</div>
                                            <h3>Gratitude Garden</h3>
                                            <p>Plant virtual flowers by listing things you're thankful for</p>
                                            <div className="game-meta">
                                                <span className="game-duration">⏱️ 3 minutes</span>
                                                <span className="game-benefit">😊 Mood booster</span>
                                            </div>
                                            <button
                                                className="btn-play"
                                                onClick={startGratitudeGame}
                                                disabled={!userData}
                                            >
                                                Start Gratitude Practice
                                            </button>
                                        </div>

                                        <div className="game-card">
                                            <div className="game-icon">🧘</div>
                                            <h3>Guided Meditation</h3>
                                            <p>Calming guided session to restore focus and calm</p>
                                            <div className="game-meta">
                                                <span className="game-duration">⏱️ 5 minutes</span>
                                                <span className="game-benefit">🧘 Relaxation</span>
                                            </div>
                                            <button
                                                className="btn-play"
                                                onClick={startGuidedMeditation}
                                                disabled={!userData}
                                            >
                                                Start Meditation
                                            </button>
                                        </div>

                                        <div className="game-card">
                                            <div className="game-icon">💡</div>
                                            <h3>Thought Catcher</h3>
                                            <p>Capture a negative thought and practice reframing it</p>
                                            <div className="game-meta">
                                                <span className="game-duration">⏱️ 2 minutes</span>
                                                <span className="game-benefit">💭 Cognitive reframe</span>
                                            </div>
                                            <button
                                                className="btn-play"
                                                onClick={startThoughtCatcher}
                                                disabled={!userData}
                                            >
                                                Start Thought Catcher
                                            </button>
                                        </div>
                                    </div>
                                ) : currentGame === 'breathing' ? (
                                    <div className="active-game breathing-game">
                                        <div className="game-header">
                                            <h3>🌀 Breathing Exercise</h3>
                                            <div className="game-timer">Time: {formatTime(gameTime)}</div>
                                        </div>
                                        
                                        <div className="breathing-instructions">
                                            <p>Follow the pattern: <strong>{breathingPhase}</strong></p>
                                            <p>Inhale (4s) → Hold (4s) → Exhale (4s)</p>
                                        </div>
                                        
                                        <div className="bubble-container">
                                            <div
                                                className="breathing-bubble"
                                                style={{
                                                    width: `${bubbleSize}px`,
                                                    height: `${bubbleSize}px`,
                                                    backgroundColor: getBubbleColor(breathingPhase)
                                                }}
                                            >
                                                <div className="bubble-text">{breathingPhase}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="breathing-guide">
                                            <div className={`guide-step ${breathingPhase === 'INHALE' ? 'active' : ''}`}>
                                                <div className="step-dot"></div>
                                                <span>Inhale (4s)</span>
                                            </div>
                                            <div className={`guide-step ${breathingPhase === 'HOLD' ? 'active' : ''}`}>
                                                <div className="step-dot"></div>
                                                <span>Hold (4s)</span>
                                            </div>
                                            <div className={`guide-step ${breathingPhase === 'EXHALE' ? 'active' : ''}`}>
                                                <div className="step-dot"></div>
                                                <span>Exhale (4s)</span>
                                            </div>
                                        </div>
                                        
                                        <button
                                            className="btn-stop"
                                            onClick={() => {
                                                setCurrentGame(null);
                                                cleanupIntervals();
                                            }}
                                        >
                                            🛑 Stop Exercise
                                        </button>
                                    </div>
                                ) : currentGame === 'gratitude' ? (
                                    <div className="active-game gratitude-game">
                                        <div className="game-header">
                                            <h3>🌼 Gratitude Garden</h3>
                                            <div className="game-timer">Time: {formatTime(gameTime)}</div>
                                        </div>
                                        
                                        <p>What are you thankful for today?</p>
                                        
                                        <div className="garden-display">
                                            {gratitudeItems.length === 0 ? (
                                                <div className="empty-garden">
                                                    <div className="empty-icon">🌱</div>
                                                    <p>Your garden is empty</p>
                                                    <p>Add something you're thankful for!</p>
                                                </div>
                                            ) : (
                                                <div className="flowers-grid">
                                                    {gratitudeItems.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="flower-item"
                                                            style={{ color: item.color }}
                                                        >
                                                            <div className="flower-icon">{item.flower}</div>
                                                            <div className="flower-text">{item.text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="gratitude-input">
                                            <input
                                                type="text"
                                                placeholder="I'm thankful for..."
                                                value={newGratitude}
                                                onChange={(e) => setNewGratitude(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && addGratitudeItem()}
                                                className="gratitude-field"
                                                maxLength="100"
                                            />
                                            <button
                                                className="btn-add"
                                                onClick={addGratitudeItem}
                                                disabled={!newGratitude.trim()}
                                            >
                                                Add Flower
                                            </button>
                                        </div>
                                        
                                        <div className="garden-stats">
                                            <p>🌺 Flowers planted: <strong>{gratitudeItems.length}</strong></p>
                                            <p>⏱️ Time left: <strong>{formatTime(gameTime)}</strong></p>
                                        </div>
                                        
                                        <button
                                            className="btn-stop"
                                            onClick={() => {
                                                setCurrentGame(null);
                                                finishGratitudeGame();
                                            }}
                                        >
                                            🌸 Finish Gardening
                                        </button>
                                    </div>
                                ) : currentGame === 'guided_meditation' ? (
                                    <div className="active-game meditation-game">
                                        <div className="game-header">
                                            <h3>🧘 Guided Meditation</h3>
                                            <div className="game-timer">Time: {formatTime(gameTime)}</div>
                                        </div>

                                        <div className="meditation-content">
                                            <p>Close your eyes and follow the gentle voice. Focus on your breath and body sensations.</p>
                                            <p>We'll guide you for {formatTime(gameTime)}.</p>
                                        </div>

                                        <button
                                            className="btn-stop"
                                            onClick={() => {
                                                setCurrentGame(null);
                                                finishGuidedMeditation();
                                            }}
                                        >
                                            🛑 End Session
                                        </button>
                                    </div>
                                ) : currentGame === 'thought_catcher' ? (
                                    <div className="active-game thought-catcher-game">
                                        <div className="game-header">
                                            <h3>💡 Thought Catcher</h3>
                                            <div className="game-timer">Time: {formatTime(gameTime)}</div>
                                        </div>

                                        <p>Write a thought that is bothering you, then try to reframe it in a kinder way.</p>

                                        <div className="gratitude-input">
                                            <input
                                                type="text"
                                                placeholder="That thought is..."
                                                value={newGratitude}
                                                onChange={(e) => setNewGratitude(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && addGratitudeItem()}
                                                className="gratitude-field"
                                                maxLength="150"
                                            />
                                            <button
                                                className="btn-add"
                                                onClick={addGratitudeItem}
                                                disabled={!newGratitude.trim()}
                                            >
                                                Capture Thought
                                            </button>
                                        </div>

                                        <div className="garden-stats">
                                            <p>Captured: <strong>{gratitudeItems.length}</strong></p>
                                            <p>⏱️ Time left: <strong>{formatTime(gameTime)}</strong></p>
                                        </div>

                                        <button
                                            className="btn-stop"
                                            onClick={() => {
                                                setCurrentGame(null);
                                                finishThoughtCatcher();
                                            }}
                                        >
                                            ✅ Finish & Reframe
                                        </button>
                                    </div>
                                ) : null}
                                
                                {!userData && (
                                    <div className="no-user-message">
                                        <p>Please complete onboarding to access activities.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Insights View */}
                        {currentView === 'insights' && (
                            <div className="insights-view">
                                <h2>Your Wellness Insights</h2>

                                {/* Connection / Sync Actions */}
                                <div className="insights-actions">
                                    {!backendOnline && (
                                        <button
                                            className="btn-secondary"
                                            onClick={async () => {
                                                const ok = await checkBackendHealth();
                                                if (ok && userData) fetchInsights(userData.id);
                                            }}
                                        >
                                            🔄 Retry Connection
                                        </button>
                                    )}

                                    {userData && (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => syncLocalData()}
                                        >
                                            ⤴️ Sync Local Data
                                        </button>
                                    )}
                                </div>

                                {!userData ? (
                                    <div className="no-user-message">
                                        <p>Please complete onboarding to view insights.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="insights-grid">
                                            <div className="insight-card">
                                                <h3>📊 Mood Statistics</h3>
                                                <div className="insight-content">
                                                    <div className="stat-row">
                                                        <span className="stat-label">Average Mood:</span>
                                                        <span className="stat-value">{insightsData?.stats?.avgMood || '--'}/10</span>
                                                    </div>
                                                    <div className="stat-row">
                                                        <span className="stat-label">Consistency:</span>
                                                        <span className="stat-value">{insightsData?.stats?.consistency ? `${insightsData.stats.consistency.toFixed(0)}%` : '--'}</span>
                                                    </div>
                                                    <div className="stat-row">
                                                        <span className="stat-label">Total Logs:</span>
                                                        <span className="stat-value">{insightsData?.stats?.totalLogs || '--'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="insight-card">
                                                <h3>🎯 Recommendations</h3>
                                                <div className="insight-content">
                                                    <ul className="recommendations-list">
                                                        <li>🎮 Try a calming game when stressed</li>
                                                        <li>📝 Journal in the evening for reflection</li>
                                                        <li>🧘 Practice breathing exercises daily</li>
                                                        <li>⏰ Set regular check-in reminders</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="patterns-section">
                                            <h3>🔍 Detected Patterns</h3>
                                            {patterns.length > 0 ? (
                                                <div className="patterns-list">
                                                    {patterns.map((pattern, index) => (
                                                        <div key={index} className="pattern-item">
                                                            <div className="pattern-icon">📊</div>
                                                            <div className="pattern-content">
                                                                <h4>{pattern.message || pattern.insightMessage || 'Pattern detected'}</h4>
                                                                <p className="pattern-suggestion">
                                                                    💡 {pattern.suggestion || (pattern.riskLevel === 'HIGH' ? 'Consider proactive stress management' : 'Keep observing this behavior')}
                                                                    {pattern.riskLevel === 'HIGH' && ' ⚠️'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))} 
                                                </div>
                                            ) : (
                                                <p className="no-patterns">Keep logging your mood to discover patterns!</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {/* Voice View */}
                        {currentView === 'voice' && (
                            <div className="voice-view">
                                <h2>🎤 Voice Check</h2>
                                <p className="subtitle">Speak for up to 10 seconds. Our AI will analyze stress in your voice.</p>
                                
                                {!userData ? (
                                    <div className="no-user-message">
                                        <p>Please complete onboarding to use voice check.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="voice-recorder">
                                            <div className="recorder-status">
                                                {isRecording ? (
                                                    <>
                                                        <div className="recording-indicator"></div>
                                                        <span>Recording... {recordingTime}s / {recordingMax}s</span>
                                                    </>
                                                ) : (
                                                    <span>Click to start recording</span>
                                                )}
                                            </div>
                                            
                                            <button
                                                className={`record-btn ${isRecording ? 'stop' : 'start'}`}
                                                onClick={handleVoiceRecording}
                                                disabled={loading}
                                            >
                                                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                                            </button>
                                            
                                            <p className="recorder-note">
                                                🔒 Your voice is processed locally when possible. We respect your privacy.
                                            </p>
                                        </div>
                                        
                                        {voiceAnalysis && (
                                            <div className="voice-analysis">
                                                <h3>Voice Analysis Results</h3>
                                                <div className="analysis-grid">
                                                    <div className="analysis-item">
                                                        <div className="analysis-label">Stress Level</div>
                                                        <div className="analysis-value">{voiceAnalysis.stressScore}/10</div>
                                                        <div className="analysis-bar">
                                                            <div
                                                                className="bar-fill"
                                                                style={{ width: `${voiceAnalysis.stressScore * 10}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="analysis-item">
                                                        <div className="analysis-label">Emotion</div>
                                                        <div className="analysis-value">{voiceAnalysis.emotion}</div>
                                                    </div>
                                                    <div className="analysis-item">
                                                        <div className="analysis-label">Confidence</div>
                                                        <div className="analysis-value">{(voiceAnalysis.confidence * 100).toFixed(0)}%</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="insights-section">
                                                    <h4>Insights:</h4>
                                                    <ul>
                                                        {voiceAnalysis.insights?.map((insight, idx) => (
                                                            <li key={idx}>{insight}</li>
                                                        )) || [
                                                            'Voice pattern analysis complete',
                                                            'No significant issues detected'
                                                        ].map((insight, idx) => (
                                                            <li key={idx}>{insight}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
            
            {/* Footer */}
            <footer className="app-footer">
                <div className="footer-content">
                    <p>🧠 MindShield | AI Mental Wellness Companion</p>
                    <div className="footer-links">
                        <button
                            className="footer-link"
                            onClick={() => setModalContent({ title: 'Crisis Resources', body: 'If you are in immediate danger, call your local emergency number. For US users, call 988.\n\nLocal resources and hotlines would be listed here.' })}
                        >
                            🆘 Crisis Resources
                        </button>
                        <button
                            className="footer-link"
                            onClick={() => setModalContent({ title: 'Privacy Policy', body: 'MindShield stores minimal personal data locally. Check the full privacy policy at /privacy (demo).' })}
                        >
                            🔒 Privacy Policy
                        </button>
                        <button
                            className="footer-link"
                            onClick={() => setModalContent({ title: 'Settings', body: 'Settings are available in the app. You can configure reminders and notification preferences here (demo).' })}
                        >
                            ⚙️ Settings
                        </button>
                    </div>
                    <p className="disclaimer">
                        This app is for self-reflection and support, not medical advice. In crisis, call: 988
                    </p>
                </div>
            </footer>

            {modalContent && (
                <div className="modal-overlay" onClick={() => setModalContent(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>{modalContent.title}</h3>
                        <p style={{ whiteSpace: 'pre-line' }}>{modalContent.body}</p>
                        <div style={{ textAlign: 'right', marginTop: '12px' }}>
                            <button className="action-btn primary" onClick={() => setModalContent(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;