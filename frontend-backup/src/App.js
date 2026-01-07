import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { Line } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [step, setStep] = useState('onboarding'); // onboarding, home, mood, insights, games
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [responses, setResponses] = useState({});
  const [mood, setMood] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [insights, setInsights] = useState(null);
  const [games, setGames] = useState([]);
  const [moodHistory, setMoodHistory] = useState([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Mood options
  const moodOptions = [
    { emoji: '😊', label: 'Excellent', value: 9, color: '#4CAF50' },
    { emoji: '🙂', label: 'Good', value: 7, color: '#8BC34A' },
    { emoji: '😐', label: 'Neutral', value: 5, color: '#FFC107' },
    { emoji: '😔', label: 'Low', value: 3, color: '#FF9800' },
    { emoji: '😢', label: 'Struggling', value: 1, color: '#F44336' }
  ];

  // Onboarding questions
  const onboardingQuestions = [
    { id: 1, question: "When I feel rushed, I usually...", options: ['Work faster', 'Take a pause', 'Get overwhelmed', 'Make a list'] },
    { id: 2, question: "When I'm mentally tired, I tend to...", options: ['Rest', 'Push through', 'Get irritable', 'Seek quiet'] },
    { id: 3, question: "During restlessness, I often...", options: ['Fidget', 'Go for a walk', 'Distract myself', 'Try to relax'] },
    { id: 4, question: "When overwhelmed, my first instinct is to...", options: ['Withdraw', 'Seek help', 'Make a plan', 'Breathe deeply'] },
    { id: 5, question: "To calm down, I typically...", options: ['Listen to music', 'Breathe', 'Talk to someone', 'Be alone'] }
  ];

  // Register user
  const registerUser = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/register`, {
        name,
        age,
        responses
      });
      setUserData(response.data.user);
      setStep('home');
      localStorage.setItem('mindshield_user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  // Log mood
  const logMood = async (moodValue) => {
    setMood(moodValue);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mood`, {
        userId: userData.id,
        mood: moodValue,
        notes: '',
        context: { timeOfDay: new Date().getHours() }
      });
      setAiResponse(response.data.log.aiResponse);
      
      // Show prediction if available
      if (response.data.log.stressPrediction) {
        setTimeout(() => {
          alert(`⚠️ Stress Alert: ${response.data.log.stressPrediction.message}`);
        }, 500);
      }
      
      // Refresh insights
      fetchInsights();
      fetchMoodHistory();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  // Handle voice recording
  const handleVoiceRecording = async (blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    try {
      const formData = new FormData();
      formData.append('userId', userData?.id || '');
      formData.append('audio', blob, 'voice.webm');
      const response = await axios.post(`${API_BASE_URL}/api/voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVoiceAnalysis(response.data.analysis);
      alert(`Voice Analysis: ${response.data.analysis.emotion} (Stress: ${response.data.analysis.stressScore}/10)\n\nSuggestion: ${response.data.suggestion}`);
    } catch (error) {
      console.error('Voice analysis error:', error);
      // Fallback mock if server is not available
      const mock = { stressScore: 4, emotion: 'neutral', confidence: '0.7' };
      setVoiceAnalysis(mock);
      alert(`Voice Analysis: ${mock.emotion} (Stress: ${mock.stressScore}/10)`);
    }
  };

  // Mock voice recording (for hackathon demo)
  const handleRecordClick = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setRecordingTime(0);
      if (window.recordingTimer) {
        clearInterval(window.recordingTimer);
        window.recordingTimer = null;
      }
      // Create mock audio URL
      const mockAudioUrl = 'data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YU4AAAB';
      setAudioUrl(mockAudioUrl);
    } else {
      // Start recording
      setIsRecording(true);
      setAudioUrl(null);
      setVoiceAnalysis(null);
      setRecordingTime(0);

      // Simulate recording timer
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes max
            clearInterval(timer);
            handleRecordClick();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Store timer ID
      window.recordingTimer = timer;
    }
  };

  // Handle voice analysis (mocked for hackathon demo)
  const handleVoiceAnalysis = async (audioUrl) => {
    try {
      // Mock analysis for hackathon
      const stressScore = (Math.random() * 10).toFixed(1);
      const emotions = ['Calm', 'Anxious', 'Tired', 'Energetic', 'Neutral'];
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      
      const mockAnalysis = {
        stressScore,
        emotion,
        confidence: (Math.random() * 0.5 + 0.5).toFixed(2),
        suggestions: stressScore > 7 
          ? "High stress detected. Try our breathing bubble game."
          : "Voice analysis shows normal stress levels. Keep up the good work!"
      };
      
      setVoiceAnalysis(mockAnalysis);
      
      // Show alert with results
      alert(`🎤 Voice Analysis Complete!\n\nStress: ${stressScore}/10\nEmotion: ${emotion}\n\nSuggestion: ${mockAnalysis.suggestions}`);
      
    } catch (error) {
      console.error('Voice analysis error:', error);
      alert('Voice analysis failed. Please try again.');
    }
  };

  // Fetch insights
  const fetchInsights = async () => {
    if (!userData) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/insights/${userData.id}`);
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  // Fetch mood history for chart
  const fetchMoodHistory = async () => {
    if (!userData) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mood-history/${userData.id}`);
      setMoodHistory(response.data.history);
    } catch (error) {
      console.error('Error fetching mood history:', error);
    }
  };

  // Fetch games
  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/games`);
      setGames(response.data.games);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  // Get mood color
  const getMoodColor = (moodValue) => {
    const mood = moodOptions.find(m => m.value === moodValue);
    return mood ? mood.color : '#9E9E9E';
  };

  // Chart data
  const chartData = {
    labels: moodHistory.slice(-10).map((_, index) => `Day ${index + 1}`),
    datasets: [
      {
        label: 'Mood Trend',
        data: moodHistory.slice(-10).map(log => log.mood),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        title: {
          display: true,
          text: 'Mood Level'
        }
      }
    }
  };

  // Initialize
  useEffect(() => {
    // Check for saved user
    const savedUser = localStorage.getItem('mindshield_user');
    if (savedUser) {
      setUserData(JSON.parse(savedUser));
      setStep('home');
    }
    
    fetchGames();
  }, []);

  // Fetch data when user is set
  useEffect(() => {
    if (userData) {
      fetchInsights();
      fetchMoodHistory();
    }
  }, [userData]);

  // Render onboarding
  if (step === 'onboarding') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card">
          <h1 className="app-title">🧠 MindShield</h1>
          <p className="app-subtitle">AI-Powered Mental Wellness Companion</p>
          
          <div className="onboarding-step">
            <h2>Welcome! Let's get to know you</h2>
            
            <div className="input-group">
              <label>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
              />
            </div>
            
            <div className="input-group">
              <label>Your Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                className="input-field"
              />
            </div>
            
            <h3>Quick Questions (Optional)</h3>
            <p className="helper-text">This helps personalize your experience</p>
            
            {onboardingQuestions.map((q, index) => (
              <div key={q.id} className="question-group">
                <label>{q.question}</label>
                <select
                  className="input-field"
                  onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                >
                  <option value="">Select an option</option>
                  {q.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
            
            <button 
              onClick={registerUser}
              className="btn-primary"
              disabled={!name || !age}
            >
              Start Your Wellness Journey
            </button>
            
            <p className="privacy-note">
              🔒 Your data stays private. We never share personal information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🧠 MindShield</h1>
          <div className="user-info">
            <span className="user-name">Hi, {userData?.name}</span>
            <button 
              className="btn-logout"
              onClick={() => {
                localStorage.removeItem('mindshield_user');
                setUserData(null);
                setStep('onboarding');
              }}
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="app-nav">
          <button 
            className={`nav-btn ${step === 'home' ? 'active' : ''}`}
            onClick={() => setStep('home')}
          >
            🏠 Home
          </button>
          <button 
            className={`nav-btn ${step === 'mood' ? 'active' : ''}`}
            onClick={() => setStep('mood')}
          >
            😊 Log Mood
          </button>
          <button 
            className={`nav-btn ${step === 'insights' ? 'active' : ''}`}
            onClick={() => setStep('insights')}
          >
            📊 Insights
          </button>
          <button 
            className={`nav-btn ${step === 'games' ? 'active' : ''}`}
            onClick={() => setStep('games')}
          >
            🎮 Games
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {step === 'home' && (
          <div className="dashboard">
            <div className="welcome-card">
              <h2>Welcome back, {userData?.name}!</h2>
              <p>How are you feeling today? Take a moment to check in.</p>
              
              <div className="quick-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => setStep('mood')}
                >
                  😊 Log Current Mood
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                >
                  🎤 Voice Check-in
                </button>
                <button 
                  className="action-btn tertiary"
                  onClick={() => setStep('games')}
                >
                  🎮 Play Calming Game
                </button>
              </div>
            </div>
            
            {showVoiceRecorder && (
              <div className="voice-recorder-card">
                <h3>🎤 Voice Confession Booth</h3>
                <p>Talk freely for 1-3 minutes. Our AI will analyze stress in your voice.</p>
                
                <div className="voice-recorder-simple">
                  <div className="recording-status">
                    {isRecording ? (
                      <>
                        <div className="recording-indicator"></div>
                        <span>Recording... Speak now</span>
                      </>
                    ) : (
                      <span>Click to start recording</span>
                    )}
                  </div>
                  
                  <div className="voice-controls">
                    <button 
                      className={`record-btn ${isRecording ? 'stop' : 'start'}`}
                      onClick={handleRecordClick}
                    >
                      {isRecording ? '⏹️ Stop' : '🎤 Start'}
                    </button>
                    
                    {audioUrl && (
                      <div className="audio-player">
                        <audio src={audioUrl} controls />
                        <button 
                          className="analyze-btn"
                          onClick={() => handleVoiceAnalysis(audioUrl)}
                        >
                          🤖 Analyze Voice
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {voiceAnalysis && (
                    <div className="analysis-result">
                      <h4>Voice Analysis Result:</h4>
                      <p>Stress Level: {voiceAnalysis.stressScore}/10</p>
                      <p>Emotion: {voiceAnalysis.emotion}</p>
                      <p>Confidence: {voiceAnalysis.confidence}</p>
                    </div>
                  )}
                </div>
                
                <p className="helper-text">
                  Your voice is processed locally when possible. We respect your privacy.
                </p>
              </div>
            )}
            
            {/* Quick Stats */}
            {insights && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-value">{insights.totalLogs || 0}</div>
                  <div className="stat-label">Total Logs</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">😊</div>
                  <div className="stat-value">{insights.avgMood || 'N/A'}</div>
                  <div className="stat-label">Avg Mood</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎤</div>
                  <div className="stat-value">{insights.voiceAnalysisCount || 0}</div>
                  <div className="stat-label">Voice Checks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📈</div>
                  <div className="stat-value">{moodHistory.length > 0 ? moodHistory[moodHistory.length - 1].mood : 'N/A'}</div>
                  <div className="stat-label">Latest Mood</div>
                </div>
              </div>
            )}
            
            {/* AI Suggestions */}
            {aiResponse && (
              <div className="ai-suggestion-card">
                <div className="ai-header">
                  <span className="ai-icon">🤖</span>
                  <h3>AI Companion Suggestion</h3>
                </div>
                <p className="ai-message">{aiResponse}</p>
                <div className="ai-actions">
                  <button className="btn-small">Try This</button>
                  <button className="btn-small outline">Not Now</button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {step === 'mood' && (
          <div className="mood-container">
            <h2>How are you feeling right now?</h2>
            <p className="subtitle">Select the mood that best represents your current state</p>
            
            <div className="mood-grid">
              {moodOptions.map((m) => (
                <button
                  key={m.value}
                  className={`mood-option ${mood === m.value ? 'selected' : ''}`}
                  style={{ backgroundColor: m.color }}
                  onClick={() => logMood(m.value)}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                  <span className="mood-value">{m.value}/10</span>
                </button>
              ))}
            </div>
            
            <div className="context-options">
              <h3>Context (Optional)</h3>
              <div className="context-tags">
                {['Work', 'Family', 'Health', 'Sleep', 'Social', 'Finance'].map(tag => (
                  <span key={tag} className="context-tag">{tag}</span>
                ))}
              </div>
            </div>
            
            {aiResponse && (
              <div className="ai-response-card">
                <h3>💭 AI Reflection</h3>
                <p>{aiResponse}</p>
              </div>
            )}
            
            <button 
              className="btn-secondary"
              onClick={() => setStep('insights')}
            >
              View Your Mood Trends →
            </button>
          </div>
        )}
        
        {step === 'insights' && (
          <div className="insights-container">
            <h2>Your Wellness Insights</h2>
            
            {moodHistory.length > 0 ? (
              <>
                <div className="chart-container">
                  <Line data={chartData} options={chartOptions} />
                </div>
                
                <div className="insights-grid">
                  <div className="insight-card">
                    <h3>📊 Mood Statistics</h3>
                    {insights && (
                      <div className="insight-content">
                        <p>Average Mood: <strong>{insights.avgMood}/10</strong></p>
                        <p>Mood Range: <strong>{insights.moodRange?.min} to {insights.moodRange?.max}</strong></p>
                        <p>Total Entries: <strong>{insights.totalLogs}</strong></p>
                      </div>
                    )}
                  </div>
                  
                  <div className="insight-card">
                    <h3>🔍 Detected Patterns</h3>
                    {insights?.patterns && insights.patterns.length > 0 ? (
                      <ul className="patterns-list">
                        {insights.patterns.map((pattern, index) => (
                          <li key={index}>{pattern}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Keep logging to discover patterns!</p>
                    )}
                  </div>
                  
                  <div className="insight-card">
                    <h3>🎯 Recommendations</h3>
                    <ul className="recommendations-list">
                      <li>🎮 Try a calming game when stressed</li>
                      <li>📝 Journal in the evening for reflection</li>
                      <li>🧘 Practice breathing exercises daily</li>
                      <li>⏰ Set regular check-in reminders</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Data Yet</h3>
                <p>Log your first mood to see insights and trends!</p>
                <button 
                  className="btn-primary"
                  onClick={() => setStep('mood')}
                >
                  Log Your First Mood
                </button>
              </div>
            )}
          </div>
        )}
        
        {step === 'games' && (
          <div className="games-container">
            <h2>Calming Games & Activities</h2>
            <p className="subtitle">Play these games when you need a mental break</p>
            
            <div className="games-grid">
              {games.map(game => (
                <div key={game.id} className="game-card">
                  <div className="game-icon">{game.icon}</div>
                  <h3>{game.name}</h3>
                  <p>{game.description}</p>
                  <div className="game-meta">
                    <span className="game-duration">⏱️ {game.duration}</span>
                    <span className="game-relief">💆 {game.stressRelief} relief</span>
                  </div>
                  <button className="btn-play">
                    Play Now
                  </button>
                </div>
              ))}
            </div>
            
            {/* Breathing Game Demo */}
            <div className="game-demo">
              <h3>Try Our Breathing Bubble Game</h3>
              <div className="breathing-bubble">
                <div className="bubble"></div>
              </div>
              <p>Breathe in as the bubble expands, breathe out as it contracts.</p>
              <button className="btn-primary">Start 2-Minute Session</button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>🧠 MindShield | GDG Hackathon 2025</p>
          <p className="footer-disclaimer">
            This app is for self-reflection and support, not medical advice. 
            In crisis: <a href="/api/resources/crisis" className="crisis-link">Get Immediate Help</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;