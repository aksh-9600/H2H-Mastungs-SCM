# 🚀 InsightFlow — AI-Powered Customer Retention Intelligence Platform

> A production-ready intelligent system that transforms raw customer data into **actionable insights, risk predictions, and AI-driven retention strategies**.

---

## 🌐 Live Demo

👉 **[https://insight-flow-0p6s.onrender.com]**

---

## ❗ Problem Statement

Customer retention is one of the biggest challenges in modern businesses.

Organizations struggle to:
- ❌ Identify customers likely to churn  
- ❌ Understand *why* customers disengage  
- ❌ Take proactive actions before revenue loss  
- ❌ Convert raw data into meaningful decisions  

Most existing tools:
- Are **reactive dashboards**
- Lack **intelligence and automation**
- Provide **data, not decisions**

👉 Result: **High churn, lost revenue, and poor customer experience**

---

## 💡 Solution — InsightFlow

InsightFlow is a **production-ready customer intelligence platform** that:

- 📊 Analyzes customer behavior
- ⚠️ Detects churn risk early
- 🤖 Generates AI-powered recommendations
- 📈 Provides business-focused insights

It answers the most critical business question:

> ❝ Which customers are at risk, why, and what action should we take? ❞

---
## 📸 App Preview

<p align="center">
  <img src="insightflow images/grid.jpg" width="30%" />
  <img src="insightflow images/action.jpg" width="30%" />
  <img src="insightflow images/analytics.jpg" width="30%" />
</p>

<p align="center">
  <b>Intelligence Grid</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <b>Action Center</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <b>Analytics Dashboard</b>
</p>

---

## 🧠 Key Innovation

InsightFlow is not just a dashboard — it is a **decision intelligence engine**

✔ Combines analytics + AI  
✔ Provides **actionable outputs, not just metrics**  
✔ Works **even without external AI APIs (fallback system)**  
✔ Built with **production-readiness in mind**

---

## ✨ Core Features

### 📊 Intelligence Dashboard
- Customer overview with health scores
- Risk segmentation (Healthy / At Risk / Critical)
- Real-time insights

---

### 🧍 Customer Insights
- Individual customer profiles
- Behavior tracking
- Risk factor explanation

---

### 🤖 AI Recommendation Engine
- Suggests retention actions:
  - Call customer  
  - Send email  
  - Offer support  

- Includes:
  - Reasoning
  - Priority levels
  - Message drafts

---

### 📈 Analytics & Visualization
- Customer distribution graphs
- Risk trends
- Business impact insights

---

### 🔍 Smart NLQ Search
- Natural language queries:
  - “High risk customers”
  - “Top performing users”

- Works with:
  - AI (Gemini) OR
  - Intelligent keyword fallback

---

### 💬 AI Chatbot
- Context-aware responses
- Works even **without API key**
- Uses database intelligence

---

## 🏗️ Architecture Overview

```
Customer Data Input
        ↓
Data Processing Engine
        ↓
Feature Analysis & Risk Scoring
        ↓
Churn Detection Logic
        ↓
AI Insight Generator
        ↓
Frontend Dashboard
```

---

## 🔄 Application Flow

```
1. Load / Upload Data
2. Data Cleaning & Processing
3. Behavior Analysis
4. Risk Prediction
5. Insight Generation
6. Visualization & Actions
```

---

## 🧱 Project Structure

```
InsightFlow/
│
├── static/                 # Frontend (SPA)
│   ├── index.html
│   ├── app.js
│
├── main.py                 # FastAPI backend (core logic)
├── mock_generator.py       # ML-based sample data generator
├── sample_customers.csv    # Demo dataset
├── insight_flow.db         # SQLite DB
├── requirements.txt
├── Dockerfile
├── .gitignore
└── README.md
```


---

## 📸 Application Screenshots

| Dashboard | Analytics | Customer View |
|----------|----------|---------------|
| ![Dashboard](ADD_IMAGE_LINK_1) | ![Analytics](ADD_IMAGE_LINK_2) | ![Customer](ADD_IMAGE_LINK_3) |

---

## ⚡ Quick Start

### 🔹 Run Locally

```bash
git clone YOUR_REPO_LINK
cd InsightFlow

pip install -r requirements.txt
python main.py
```

---

### 🔹 Run with Docker

```bash
docker build -t insightflow .
docker run -p 8000:8000 insightflow
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---------|--------|------------|
| `/api/dashboard` | GET | Customer insights |
| `/api/customers` | GET | Customer directory |
| `/api/actions` | GET | AI recommendations |
| `/api/analytics` | GET | Chart data |
| `/api/query` | POST | NLQ search |
| `/api/chat` | POST | AI chatbot |

---

## 🧪 Production Readiness Audit ✅

### ✔ Dependency Verification
- All dependencies validated
- Missing package (`python-multipart`) fixed

---

### ✔ API Testing
- All endpoints tested (200 OK)
- Stable responses with real data

---

### ✔ Frontend Audit
- No console errors
- All views fully functional

---

### ✔ System Stability
- Zero backend errors
- Fully operational without API keys

---

### ✔ Data Validation
- 200 customers seeded
- Risk classification working

---

## 📋 Ready-to-Deploy Checklist

- ✔ Dependencies configured  
- ✔ Backend APIs tested  
- ✔ Frontend rendering verified  
- ✔ AI + fallback logic working  
- ✔ Database integrated  
- ✔ Docker configured  
- ✔ CORS enabled  

👉 **Status: PRODUCTION READY ✅**

---

## 🚀 Deployment Options

### ⭐ Option 1: Render (Recommended)

- Push repo to GitHub
- Connect to Render
- Use:
  - Build: `pip install -r requirements.txt`
  - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

### ☁ Option 2: Google Cloud Run

```bash
gcloud run deploy insight-flow \
--source . \
--region us-central1 \
--allow-unauthenticated \
--port 8000
```

---

### ⚡ Option 3: Railway

```bash
railway init
railway up
```

---

## 🛠️ Tech Stack

- **Backend:** Python (FastAPI)
- **Database:** SQLite
- **Frontend:** HTML, CSS, JavaScript
- **Visualization:** Chart.js
- **AI Integration:** Gemini API (optional)
- **Containerization:** Docker

---

## 📊 Use Cases

- Customer churn prediction  
- Retention strategy planning  
- Customer segmentation  
- Business intelligence insights  

---

## 📄 License

MIT License

---

## 🌟 Final Note

InsightFlow bridges the gap between:

> **Data → Insights → Decisions → Actions**

It empowers businesses to:
- Predict problems early  
- Take proactive actions  
- Retain valuable customers  

🚀 **Built for real-world impact, not just demonstration**
