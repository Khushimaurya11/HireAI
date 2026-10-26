const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const initFirebase = require('../config/firebase');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * POST /api/auth/google
 * body: { idToken }  — the Firebase ID token obtained on the client after
 * a successful Google sign-in popup.
 */
async function googleAuth(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });

    const admin = initFirebase();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decoded;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId: uid,
        credits: Number(process.env.SIGNUP_BONUS_CREDITS) || 100,
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user: { id: user._id, name: user.name, email: user.email, credits: user.credits } });
  } catch (err) {
    console.error('[auth] googleAuth error:', err.message);
    res.status(401).json({ error: 'Google sign-in verification failed' });
  }
}

/**
 * POST /api/auth/register
 * body: { name, email, password }
 */
async function register(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      credits: Number(process.env.SIGNUP_BONUS_CREDITS) || 100,
    });
    setAuthCookie(res, signToken(user));
    res.json({ user: { id: user._id, name: user.name, email: user.email, credits: user.credits } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    console.error('[auth] register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
async function login(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    setAuthCookie(res, signToken(user));
    res.json({ user: { id: user._id, name: user.name, email: user.email, credits: user.credits } });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
}

/** GET /api/auth/me */
async function me(req, res) {
  const { _id, name, email, credits } = req.user;
  res.json({ user: { id: _id, name, email, credits } });
}

/** PATCH /api/auth/profile */
async function updateProfile(req, res) {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (name.length > 100) return res.status(400).json({ error: 'name must be 100 characters or fewer' });

  req.user.name = name;
  await req.user.save();
  const { _id, email, credits } = req.user;
  res.json({ user: { id: _id, name: req.user.name, email, credits } });
}

/** POST /api/auth/logout */
function logout(req, res) {
  res.clearCookie('token');
  res.json({ message: 'Signed out' });
}

module.exports = { googleAuth, register, login, me, updateProfile, logout };
