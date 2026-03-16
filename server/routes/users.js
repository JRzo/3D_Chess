import express from 'express';
import { isValidObjectId } from 'mongoose';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 30 requests per minute for leaderboard / game-history reads
const readLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down' },
});

// 5 puzzle-solved submissions per minute — prevents streak inflation via rapid replay
const puzzleLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many puzzle submissions, please slow down' },
});

const USERNAME_RE   = /^[a-zA-Z0-9_]{3,20}$/;
const ALLOWED_AVATARS = new Set(['♟','♞','♜','♛','♚','♝','⚔','🏆','👑','⭐','🔥','💎','🎯','🐉','🦁','🌟']);
const ALLOWED_THEMES  = new Set(['dark', 'light']);
const ALLOWED_BOARDS  = new Set(['wood', 'marble', 'neon']);
const ALLOWED_PIECE_COLORS = new Set(['classic','walnut','crystal','royal','obsidian','gold']);

router.get('/', readLimit, async (req, res) => {
  try {
    const users = await User.find()
      .select('username stats avatar elo currentWinStreak bestWinStreak createdAt')
      .sort({ elo: -1 })
      .limit(50);
    res.json(users);
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid user ID' });

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, bio, avatar, settings } = req.body;
    const update = {};

    if (username !== undefined) {
      if (typeof username !== 'string' || !USERNAME_RE.test(username))
        return res.status(400).json({ message: 'Username must be 3–20 alphanumeric characters' });

      const taken = await User.findOne({ username, _id: { $ne: req.userId } });
      if (taken) return res.status(400).json({ message: 'Username already taken' });
      update.username = username;
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 160)
        return res.status(400).json({ message: 'Bio must be 160 characters or fewer' });
      // Strip HTML tags/entities to prevent stored XSS if bio is ever rendered as HTML
      const stripped = bio.trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      update.bio = stripped;
    }

    if (avatar !== undefined) {
      if (!ALLOWED_AVATARS.has(avatar))
        return res.status(400).json({ message: 'Invalid avatar selection' });
      update.avatar = avatar;
    }

    if (settings !== undefined) {
      if (typeof settings !== 'object' || Array.isArray(settings))
        return res.status(400).json({ message: 'Invalid settings' });

      const s = {};
      if (settings.soundEnabled !== undefined) s.soundEnabled = Boolean(settings.soundEnabled);
      if (settings.musicEnabled !== undefined) s.musicEnabled = Boolean(settings.musicEnabled);
      if (settings.theme !== undefined) {
        if (!ALLOWED_THEMES.has(settings.theme))
          return res.status(400).json({ message: 'Invalid theme' });
        s.theme = settings.theme;
      }
      if (settings.boardStyle !== undefined) {
        if (!ALLOWED_BOARDS.has(settings.boardStyle))
          return res.status(400).json({ message: 'Invalid board style' });
        s.boardStyle = settings.boardStyle;
      }
      if (settings.pieceColorScheme !== undefined) {
        if (!ALLOWED_PIECE_COLORS.has(settings.pieceColorScheme))
          return res.status(400).json({ message: 'Invalid piece color scheme' });
        s.pieceColorScheme = settings.pieceColorScheme;
      }
      if (settings.showTutorial !== undefined) s.showTutorial = Boolean(settings.showTutorial);
      update.settings = { ...s };
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error('PUT /users/me error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// POST /users/me/puzzle-solved — record daily puzzle streak
router.post('/me/puzzle-solved', authenticate, puzzleLimit, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.lastPuzzleDate === today) {
      // Already recorded today — idempotent
      return res.json({ puzzleStreak: user.puzzleStreak, alreadySolved: true });
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (user.lastPuzzleDate === yesterday) {
      user.puzzleStreak = (user.puzzleStreak || 0) + 1;
    } else {
      user.puzzleStreak = 1; // streak broken or first ever
    }
    user.lastPuzzleDate = today;
    await user.save();
    res.json({ puzzleStreak: user.puzzleStreak, alreadySolved: false });
  } catch (err) {
    console.error('POST /users/me/puzzle-solved error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

export default router;
