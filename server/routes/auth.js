import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');

// 10 attempts per 15 minutes per IP on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ token, user: userData });
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

    // Always run bcrypt to prevent timing-based email enumeration
    const DUMMY_HASH = '$2a$12$dummyhashfordummycompare000000000000000000000000000000';
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toObject();
    res.json({ token, user: userData });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
