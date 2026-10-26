# Hire-AI — Interview Agent & Recruitment Platform

## Folder structure
```
HireAI-Project/
├── frontend/
│   └── index.html        ← standalone, self-contained interview app (runs with zero setup)
└── backend/               ← Node.js / Express / MongoDB API matching the synopsis architecture
    ├── server.js
    ├── config/            (MongoDB + Firebase Admin setup)
    ├── models/             (User, Interview, Payment — Mongoose schemas)
    ├── controllers/        (auth, resume, interview, payment logic)
    ├── routes/
    ├── middleware/         (JWT auth, multer resume upload)
    ├── utils/               (OpenRouter client, PDF parser, local heuristic fallbacks)
    └── .env.example
```

## Two ways to use this

### 1. Just try it — no setup (`frontend/index.html`)
Open `frontend/index.html` directly in Chrome or Edge. It runs entirely client-side: PDF resume
parsing, voice interview (Web Speech API), a local scoring engine, PDF report export and a credit
wallet, all persisted in your browser's local storage. Sign-in, question generation and grading are
simulated locally in this mode — good for a demo or for the viva, not wired to the backend.

### 2. The real full-stack app (`backend/` + `frontend/`)
The `backend/` folder is a genuine Express/MongoDB API implementing every module from the synopsis:
Google OAuth + JWT sessions, resume upload & parsing, OpenRouter (GPT-4o-mini) question generation
and grading, and Razorpay payments with HMAC SHA-256 verification. It needs your own API keys to go
live (see below) — without them it still runs, using the same local heuristic engine as the frontend
demo as a fallback, so nothing breaks while you're waiting on keys.

## Running the backend

```bash
cd backend
cp .env.example .env      # then fill in your own keys, see below
npm install
npm run dev                # or: npm start
```

The API listens on `http://localhost:5000` by default. Health check: `GET /api/health`.

### Environment variables (`.env`)
| Variable | What it's for | Required to run at all? |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | Yes, for any DB-backed route |
| `JWT_SECRET` | Signs session tokens | Yes |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Verifies Google sign-in tokens from the frontend | Only for `/api/auth/google` |
| `OPENROUTER_API_KEY` | Real GPT-4o-mini question generation & grading | No — falls back to the local heuristic engine if missing |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Real payment orders + signature verification | Only for `/api/payment/*` |

Get these from: MongoDB Atlas, the Firebase console (Project settings → Service accounts → Generate
new private key), OpenRouter (openrouter.ai/keys), and the Razorpay dashboard.

## API reference

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/google` | — | Verify a Firebase Google ID token, create/find the user, set a JWT cookie |
| GET | `/api/auth/me` | Yes | Current user + wallet balance |
| POST | `/api/auth/logout` | — | Clear the session cookie |
| POST | `/api/resume/upload` | Yes | Multipart PDF upload → `{ role, experience, skills[], projects[] }` |
| POST | `/api/interview/start` | Yes | Deducts 50 credits, generates 5 questions (2 Easy / 2 Medium / 1 Hard) |
| POST | `/api/interview/:id/answer` | Yes | Grades one answer (correctness / communication / confidence) |
| POST | `/api/interview/:id/complete` | Yes | Computes averages + final score, marks `Completed` |
| GET | `/api/interview` | Yes | List the signed-in user's sessions |
| GET | `/api/interview/:id` | Yes | One session's full detail |
| POST | `/api/payment/order` | Yes | Creates a Razorpay order for the Starter (150 cr / ₹100) or Pro (650 cr / ₹500) pack |
| POST | `/api/payment/verify` | Yes | HMAC SHA-256 signature check, then credits the wallet |

Every route that calls OpenRouter (`resume/upload`, `interview/start`, `interview/:id/answer`) is
wrapped in a try/catch that falls back to a deterministic local scoring/parsing engine
(`backend/utils/heuristics.js`) if the API key is missing or the call fails — so the product keeps
working end-to-end even before you've added billing to OpenRouter.

## Connecting the frontend to this backend
The frontend now calls the backend when it is available. Manual/demo sign-in uses
`POST /api/auth/local` outside production, resume parsing uses `/api/resume/upload`, interviews use
`/api/interview/*`, and session history is loaded from MongoDB. Requests include
`credentials: 'include'` so the JWT cookie is sent. If the backend is unavailable, resume parsing,
question generation, scoring and wallet behavior fall back to the standalone local demo flow.

Google sign-in is wired through the Firebase browser SDK. Copy
`frontend/firebase-config.example.js` to `frontend/firebase-config.js` and replace its values with
the Web app configuration from Firebase Console → Project settings. Enable the Google provider
under Authentication → Sign-in method and add `http://localhost:8000` to the authorized domains.
The browser exchanges the Firebase ID token with `POST /api/auth/google`; the backend must also
have `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` set in `backend/.env`
from a Firebase Admin service-account key. The local config file is ignored so these values are not
committed.

For real payments, configure Razorpay and use the `order` + `keyId` returned by
`POST /api/payment/order` with Razorpay Checkout.js, then submit the checkout signature to
`POST /api/payment/verify`.

## Notes for the viva / report
This matches the architecture in Sections 4–8 of the project synopsis (MERN stack, JWT + Firebase
auth, Multer + OpenRouter resume pipeline, progressive-difficulty question generation, 3-metric
evaluation formula, Razorpay + HMAC SHA-256 verified wallet). The one deliberate deviation: OpenRouter
/ GPT-4o-mini calls are optional at runtime, with a same-shaped local fallback, so the app is demoable
without a funded API key.
