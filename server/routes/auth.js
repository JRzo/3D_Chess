import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';

const router = express.Router();

// JWT_SECRET is read lazily — ES module imports are hoisted before index.js
// loads .env, so reading process.env.JWT_SECRET at module-level would be undefined.
const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
};

const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dummy hash for constant-time comparison — prevents email enumeration via timing.
// Uses a fixed string (not JWT_SECRET) since this runs at module load.
const TIMING_DUMMY_HASH = bcrypt.hashSync('chess3d-timing-placeholder', 10);

function setAuthCookie(res, userId) {
  const token = jwt.sign({ userId }, getSecret(), { expiresIn: '7d' });
  res.cookie('chess3d-token', token, COOKIE_OPTS);
}

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (!USERNAME_RE.test(username))
      return res.status(400).json({ message: 'Username must be 3–20 alphanumeric characters' });

    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: 'Invalid email address' });

    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) return res.status(400).json({ message: 'Username or email already taken' });

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ username, email: email.toLowerCase(), password: hashed });
    await user.save();

    setAuthCookie(res, user._id);
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: userData });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Check account lockout
    if (user?.lockoutUntil && user.lockoutUntil > new Date()) {
      const secsLeft = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
      return res.status(429).json({ message: `Account locked. Try again in ${secsLeft}s.` });
    }

    // Always run bcrypt.compare to prevent timing-based email enumeration
    const hash = user ? user.password : TIMING_DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await user.save();
      }
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastActive = new Date();
    await user.save();

    setAuthCookie(res, user._id);
    const { password: _, ...userData } = user.toObject();
    res.json({ user: userData });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('chess3d-token', { path: '/' });
  res.json({ message: 'Logged out' });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.['chess3d-token']
      || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const { userId } = jwt.verify(token, getSecret());
    const user = await User.findById(userId).select('-password -failedLoginAttempts -lockoutUntil');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
