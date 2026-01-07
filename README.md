# 🧠 MindShield  
### *An AI That Notices When Humans Are Not Okay*

MindShield is a **proactive AI-powered mental wellness companion** designed to help users **understand emotional patterns early**, receive **personalized support**, and **build healthier habits** — without replacing mental health professionals.

This project was built as part of a **GDG TechSprint / Open Innovation Hackathon**.

---

## 🚩 Problem Statement

Most people struggle silently with **stress, anxiety, and emotional overload**.

Existing mental health tools are often:
- ❌ Reactive instead of preventive  
- ❌ Expensive or inaccessible  
- ❌ Generic and disengaging  

There is a lack of tools that can:
- Notice early emotional signals  
- Identify behavioral patterns  
- Support users **before stress escalates**

---

## 💡 Our Solution

**MindShield** is a **multi-modal AI companion** that combines:

- ⚡ Quick mood & thought logging  
- 🎙 Voice-based emotional signal analysis  
- 📱 Behavioral pattern awareness *(with consent)*  
- ⌚ Optional wearable data integration  
- 🎮 Gamified wellness activities  

MindShield focuses on **awareness, reflection, and gentle guidance**, while maintaining **ethical boundaries** and encouraging professional help when needed.

---

## ✨ Key Features

### 🧠 Core Features
- ⚡ 30-second mood logging (emoji / text / voice)
- 🤖 AI-generated reflections & journaling prompts
- 📊 Emotional trend analysis (charts & graphs)
- 🌱 Healthy habit nudges (non-clinical)

### 🚀 Advanced Features
- 🎙 Voice-based stress signal detection (prosody analysis)
- 📱 App usage pattern awareness *(opt-in)*
- ⌚ Optional wearable integration (heart rate, SpO₂ trends)
- 🎮 AI-suggested mood-refreshing mini-games
- 🏆 Streaks & badges for habit consistency
- 🎧 “Listen-only” confession mode
- 🚨 Early stress-risk indication & gentle alerts

> ⚠️ **Disclaimer**  
> MindShield is **not a medical tool** and does **not provide diagnosis or treatment**.  
> It is designed for **self-awareness and emotional support only**.

---

## 🛠️ Tech Stack

### Frontend
- React.js  
- CSS (custom styling)

### Backend
- Node.js  
- Express.js  
- MongoDB (via Mongoose)

### AI & Google Technologies
- Firebase Authentication  
- Firebase Firestore  
- Google Cloud Natural Language API (sentiment analysis)  
- TensorFlow Lite (on-device trend modeling)  
- Google Fit API *(optional wearable data)*

---

## 🗂️ Project Structure

MINDSHIELD-HACKATHON/
│
├── backend/
│ ├── models/
│ ├── server.js
│ ├── package.json
│ └── .env
│
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── services/
│ │ └── App.js
│ └── package.json
│
├── frontend-backup/
│ └── (backup version of frontend)
│
├── docs/
│ └── PPTs, diagrams, documentation
│
└── README.md

---

## ▶️ How to Run the Project Locally

### 🔹 Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or cloud)
- Git

---

### 🔹 Backend Setup

```bash
cd backend
npm install


Create a .env file inside backend/:
PORT=5000
MONGODB_URI=your_mongodb_connection_string

Start the backend server:
npm start

🔹 Frontend Setup:
cd frontend
npm install
npm start

The app will run at:

http://localhost:3000


🔄 How MindShield Works
1️⃣ User Onboarding

User signs in securely

Grants consent for optional features (voice, wearables, app usage)

2️⃣ Daily Interaction

User logs mood via emoji, text, or voice

AI may ask simple follow-up questions

3️⃣ Data Analysis

Sentiment analysis on text

Prosody-based stress detection on voice

Behavioral trend analysis over time

4️⃣ AI Support

Personalized reflections

Journaling prompts

Healthy habit suggestions

Mood-based mini-games

5️⃣ Visualization

Pie charts & trend graphs show emotional patterns

Labels indicate high / moderate / low stress phases

6️⃣ Engagement & Motivation

Streaks for consistency

Badges for positive actions

7️⃣ Ethical Escalation

If severe distress is detected, professional resources are suggested

🔐 Privacy & Ethics

All sensitive data is collected only with explicit consent

Data is encrypted and securely stored

No medical diagnosis or treatment is provided

Users can delete their data at any time

🔮 Future Scope

Federated learning for privacy-first AI

Therapist-approved content modules

Multilingual emotional support

Workplace & campus wellness dashboards

AR-based relaxation experiences

Smarter stress prediction using long-term trends

👥 Team Members

Prarthana B Gawarawad

S. MD. Adil Ahmed

Veena Shammukh



