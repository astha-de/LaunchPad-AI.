# LaunchPad AI – Smart Job Preparation Platform

A full-stack job preparation workspace built with **React**, **Tailwind CSS**, **Node.js / Express**, **MongoDB Atlas (Mongoose)**, **JWT & bcrypt**, and the **Google Gemini API** (`@google/genai`).

---

## Project Structure

```text
├── frontend/                  # React client application
│   ├── components/            # Dashboard, Auth, Resume Analyzer, JD Matcher, Interview Prep, Tracker
│   ├── context/               # AuthContext (JWT session & health status)
│   ├── services/              # Typed REST API client
│   ├── types/                 # Shared frontend TypeScript interfaces
│   ├── App.tsx                # Workspace shell & route orchestration
│   └── main.tsx               # React entry point
├── backend/                   # Express REST API & Mongoose persistence
│   ├── config/db.ts           # MongoDB Atlas connection manager
│   ├── middleware/            # JWT auth verification & DB readiness guard
│   ├── models/                # User, Application, ResumeAnalysis, JobMatch, InterviewPrep, Activity
│   ├── routes/                # /api/auth, /api/applications, /api/ai, /api/dashboard
│   ├── services/gemini.ts     # Server-side @google/genai integration
│   └── app.ts                 # Express API router & error handler
├── src/
│   ├── assets/images/         # Static UI illustration assets
│   └── index.css              # Tailwind CSS v4 entry stylesheet
├── server.ts                  # Unified Express + Vite server (port 3000)
├── .env.example               # Environment variable template (no real secrets)
└── package.json
```

---

## Features

1. **Authentication & Protected Workspace**
   - Email/password signup, login, and logout backed by `bcryptjs` password hashing and signed JWT tokens.
2. **AI Resume Analyzer**
   - Upload a `.pdf` resume (up to 5 MB) or paste resume text.
   - Extracts skills, candidate summary, strengths, weaknesses, actionable improvements, and ATS readiness notes via Gemini AI and stores history in MongoDB Atlas.
3. **Job Description Matcher**
   - Compares your resume against any pasted job description, returning a `0–100%` skill match score, matched skills, missing skills, and tailored recommendations.
4. **AI Interview Preparation**
   - Generates categorized **Technical** and **HR** interview questions for a target role and experience level, complete with model answers, key talking points, and a Practice Mode toggle.
5. **Application Tracker**
   - Full CRUD management for job applications (`Applied`, `Interview`, `Selected`, `Rejected`) with search, status filtering, and inline status updates.
6. **Dashboard Analytics**
   - Displays total applications, interview invitations, offers/selected count, average JD match score, status breakdown chart, 6-week submission trend, and recent activities.

---

## Running Locally

### Prerequisites
- **Node.js 20+** (tested on Node 22)
- A **MongoDB Atlas** cluster connection string (`MONGODB_URI`)
- A **Google Gemini API key** (`GEMINI_API_KEY`) from Google AI Studio

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key"
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/launchpad_ai?retryWrites=true&w=majority"
JWT_SECRET="your-long-random-jwt-secret"
PORT=3000
APP_URL="http://localhost:3000"
```

> **MongoDB Atlas Setup Tip:** In MongoDB Atlas, create a database user under **Database Access** and allow your IP (or `0.0.0.0/0` for cloud deployments) under **Network Access**.

### 3. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. Express serves `/api/*` while Vite serves the React frontend through the same port.

---

## REST API Reference

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server, MongoDB Atlas, and Gemini config status |
| `POST` | `/api/auth/signup` | Public | Register user with bcrypt-hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT |
| `GET` | `/api/auth/me` | JWT | Fetch current user profile |
| `POST` | `/api/ai/analyze-resume` | JWT | Analyze PDF upload or pasted resume text |
| `GET` | `/api/ai/resume-history` | JWT | Fetch past resume analyses |
| `POST` | `/api/ai/match-job` | JWT | Score resume against job description |
| `GET` | `/api/ai/match-history` | JWT | Fetch past JD matches |
| `POST` | `/api/ai/interview-prep` | JWT | Generate Technical & HR interview Q&A |
| `GET` | `/api/ai/interview-history` | JWT | Fetch saved interview prep sets |
| `GET` | `/api/applications` | JWT | List applications (filterable by `status` and `search`) |
| `POST` | `/api/applications` | JWT | Create a tracked application |
| `PUT` | `/api/applications/:id` | JWT | Update application fields or status |
| `DELETE` | `/api/applications/:id` | JWT | Delete an application |
| `GET` | `/api/dashboard/summary` | JWT | Aggregated metrics, charts, and activity timeline |

---

## Production Build & Deployment

1. Build the frontend bundle:
   ```bash
   npm run build
   ```
2. Set `NODE_ENV=production`, `MONGODB_URI`, `GEMINI_API_KEY`, and `JWT_SECRET` in your hosting provider (Render, Railway, Cloud Run, Fly.io, etc.).
3. Start the unified server:
   ```bash
   npm start
   ```
