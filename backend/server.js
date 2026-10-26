require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const learningRoutes = require('./routes/learningRoutes');

const app = express();

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:8000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8000',
]);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('CORS blocked for origin: ' + origin));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'hireai-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/learning', learningRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// centralized error handler (catches multer errors, JSON parse errors, etc.)
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.message);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.message === 'Only PDF resumes are accepted' ? 415 : (err.status || 500);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`[server] Hire-AI backend running on port ${PORT}`));
});
