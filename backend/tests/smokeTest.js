const axios = require('axios');

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

async function run() {
  try {
    // 1) Create a test user
    let res = await API.post('/register', { name: 'smoke-tester', age: 30, email: 'smoke@example.com', responses: {} });
    const userId = res.data.user.id;
    console.log('Created user:', userId);

    // 2) Log 4 mood entries to trigger pattern detection
    const moods = [6, 3, 2, 4];
    for (const m of moods) {
      await API.post('/mood', { userId, mood: m });
    }
    console.log('Logged moods:', moods);

    // 3) Fetch insights
    res = await API.get(`/insights/${userId}`);
    console.log('Insights:', JSON.stringify(res.data.insights, null, 2));

    // 4) Call voice analyze with simulated features
    res = await API.post('/voice/analyze', { userId, audioData: 'AAAA', duration: 10, features: { rms: 0.07, zeroCrossingRate: 0.25 } });
    console.log('Voice analysis:', res.data.analysis);

    // 5) Save a game session
    res = await API.post('/games/session', { userId, gameType: 'guided_meditation', duration: 120, score: 90, metrics: {} });
    console.log('Saved game session:', res.data.session);

    console.log('Smoke tests completed successfully.');
  } catch (err) {
    console.error('Smoke test error:', err.response?.data || err.message);
  }
}

run();
