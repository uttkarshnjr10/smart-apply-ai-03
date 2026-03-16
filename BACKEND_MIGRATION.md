# Backend Migration: Supabase to Express + MongoDB

## Overview

This document details the complete migration of the **Smart Apply AI** backend from **Supabase** (PostgreSQL + Edge Functions + Auth + Storage) to a custom **Express.js + MongoDB + JWT** backend. The frontend (React + Vite) was updated to use a centralized API client instead of the Supabase JS SDK.

---

## Tech Stack

### Before (Removed)
- **Supabase Auth** – email/password signup, JWT sessions
- **Supabase PostgreSQL** – 5 tables with RLS policies
- **Supabase Edge Functions** – 2 Deno serverless functions (Gemini AI)
- **Supabase Storage** – avatar image uploads
- **Supabase Realtime** – live dashboard stat subscriptions
- **@supabase/supabase-js** – frontend SDK

### After (New)
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Uploads | Multer (local disk storage) |
| AI | Google Gemini 1.5 Flash (direct REST API) |

---

## Backend Architecture (`server/`)

```
server/
├── .env.example          # Environment variable template
├── .env                  # Local env vars (git-ignored)
├── package.json          # Backend dependencies
├── uploads/              # File uploads (avatars)
└── src/
    ├── index.js          # Express app entry point
    ├── config/
    │   ├── index.js      # Environment config loader
    │   └── database.js   # MongoDB connection
    ├── middleware/
    │   └── auth.js       # JWT authentication middleware
    ├── models/
    │   ├── User.js               # User accounts (email, password, fullName)
    │   ├── Profile.js            # User profiles (contact info, settings, avatar)
    │   ├── JobApplication.js     # Job application tracking
    │   ├── InterviewQuestion.js  # Interview Q&A with AI suggestions
    │   ├── Resume.js             # Uploaded resume records
    │   └── ResumeOptimization.js # AI optimization results
    ├── routes/
    │   ├── auth.js           # POST /signup, POST /login, GET /me
    │   ├── profile.js        # GET, PUT profile + PUT settings + POST avatar
    │   ├── applications.js   # CRUD job applications
    │   ├── interviews.js     # Generate questions (Gemini) + save answers
    │   ├── resumes.js        # CRUD resumes
    │   ├── optimizations.js  # Run optimization pipeline (Gemini) + CRUD
    │   └── dashboard.js      # GET stats + GET recent activity
    └── utils/
        └── gemini.js         # Google Gemini API wrapper
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account (returns JWT + user) |
| POST | `/api/auth/login` | Login (returns JWT + user) |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile (auto-creates if missing) |
| PUT | `/api/profile` | Update profile fields |
| PUT | `/api/profile/settings` | Update notification/privacy settings |
| POST | `/api/profile/avatar` | Upload avatar image (multipart form) |

### Job Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create new application |
| PUT | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |

### Interview Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interviews` | List saved answers |
| POST | `/api/interviews/generate` | Generate 5 questions via Gemini AI |
| PUT | `/api/interviews/:id` | Save user answer + AI suggestion |
| DELETE | `/api/interviews/:id/answer` | Clear saved answer |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resumes` | List all resumes |
| POST | `/api/resumes` | Create resume record |
| DELETE | `/api/resumes/:id` | Delete resume |

### Resume Optimizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/optimizations` | List all optimizations |
| POST | `/api/optimizations` | Run full pipeline: keywords + resume + cover letter |
| DELETE | `/api/optimizations/:id` | Delete optimization |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated counts + avg match score |
| GET | `/api/dashboard/activity` | Recent 5 activities across all types |

---

## Database Models (MongoDB)

### User
- `email` (unique, lowercase)
- `password` (hashed with bcrypt, 12 rounds)
- `fullName`
- Auto timestamps (`createdAt`, `updatedAt`)

### Profile
- `userId` (ref → User, unique)
- Personal: `fullName`, `email`, `phone`, `location`, `professionalTitle`, `company`, `bio`, `avatarUrl`
- Settings: `emailNotifications`, `interviewReminders`, `resumeOptimizationAlerts`, `profileVisibility`, `dataAnalytics`

### JobApplication
- `userId`, `companyName`, `jobTitle`, `status` (enum: Applied/Interviewing/Rejected/Offer), `notes`, `appliedDate`

### InterviewQuestion
- `userId`, `question`, `category`, `jobTitle`, `companyName`, `userAnswer`, `aiSuggestion`

### Resume
- `userId`, `title`, `content`, `fileType`

### ResumeOptimization
- `userId`, `resumeId` (optional ref), `jobDescription`, `optimizedResume`, `coverLetter`, `matchScore`, `matchedKeywords[]`

---

## Frontend Changes

### New Files
- **`src/lib/api.ts`** – Centralized API client with:
  - `authApi` – signup, login, getMe
  - `profileApi` – get, update, updateSettings, uploadAvatar
  - `applicationsApi` – list, create, update, delete
  - `interviewsApi` – listSaved, generate, saveAnswer, deleteAnswer
  - `resumesApi` – list, create, delete
  - `optimizationsApi` – list, create, delete
  - `dashboardApi` – getStats, getActivity
  - Automatic JWT token injection via `localStorage`
  - Auto-redirect to `/login` on 401 responses

### Modified Files

| File | What Changed |
|------|-------------|
| `src/hooks/useAuth.tsx` | Replaced Supabase Auth with JWT (localStorage token, authApi calls) |
| `src/hooks/useDashboardStats.tsx` | Replaced Supabase queries + realtime with `dashboardApi.getStats()` + 30s polling |
| `src/hooks/useRecentActivity.tsx` | Replaced Supabase queries + realtime with `dashboardApi.getActivity()` + 30s polling |
| `src/lib/gemini.ts` | Replaced Supabase Edge Function calls with `interviewsApi` and `optimizationsApi` |
| `src/pages/ApplicationTracker.tsx` | Replaced all `supabase.from()` calls with `applicationsApi` |
| `src/pages/InterviewPractice.tsx` | Replaced all `supabase.from()` calls with `interviewsApi` |
| `src/pages/Profile.tsx` | Replaced Supabase profile + storage calls with `profileApi` |
| `src/pages/ProfileSettings.tsx` | Replaced Supabase settings queries with `profileApi` |
| `src/pages/ResumeOptimizer.tsx` | Replaced all Supabase calls with `resumesApi` + `optimizationsApi` |

### Removed Dependencies (from frontend `package.json`)
- `@supabase/supabase-js`
- `@supabase/auth-helpers-nextjs`
- `@google/generative-ai` (Gemini now called from backend)
- `dotenv` (not needed in Vite frontend)
- `express` (was mistakenly in frontend deps)

### Files No Longer Used (can be deleted)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/supabaseClient.ts`
- `supabase/` directory (config, migrations, edge functions)

---

## Security Features

1. **Password Hashing** – bcrypt with 12 salt rounds
2. **JWT Authentication** – Bearer token in Authorization header
3. **Ownership Enforcement** – All DB queries filter by `userId` from JWT
4. **Input Validation** – Required fields checked before DB operations
5. **File Upload Limits** – 2MB max for avatars, image MIME type enforced
6. **CORS** – Restricted to frontend origin
7. **Sensitive Fields** – Password excluded from all API responses via `toJSON()`

---

## How to Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Gemini API key
npm install
npm run dev
```

### Frontend
```bash
# From project root
npm install
npm run dev
```

### Environment Variables (server/.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-apply-ai
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:8080
```

### Frontend Environment (optional)
Create `.env` in project root if backend runs on a different port:
```
VITE_API_URL=http://localhost:5000/api
```

---

## Key Design Decisions

1. **Plain Express.js** – No unnecessary framework abstractions. Simple route files, one middleware for auth.
2. **Mongoose ODMs** – Clean schema definitions with validation, indexes, and auto-timestamps.
3. **JWT over sessions** – Stateless auth, works seamlessly with React SPA.
4. **Gemini on backend** – API key stays server-side (security), same 3-step pipeline as original edge functions.
5. **Polling over WebSockets** – Dashboard stats poll every 30s. Simpler than setting up a WS layer and sufficient for this use case.
6. **Multer for uploads** – Local disk storage for avatars. Easy to swap to S3/Cloudinary later by changing the storage config.
7. **Centralized API client** – Single `src/lib/api.ts` handles all HTTP calls, token management, and error handling. No scattered fetch calls.
