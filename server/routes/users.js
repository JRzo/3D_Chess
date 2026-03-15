import express from 'express';
import { isValidObjectId } from 'mongoose';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const USERNAME_RE   = /^[a-zA-Z0-9_]{3,20}$/;
const ALLOWED_AVATARS = new Set(['♟','♞','♜','♛','♚','♝','⚔','🏆','👑','⭐','🔥','💎','🎯','🐉','🦁','🌟']);
const ALLOWED_THEMES  = new Set(['dark', 'light']);
const ALLOWED_BOARDS  = new Set(['wood', 'marble', 'neon']);

router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('username stats avatar createdAt')
      .sort({ 'stats.xp': -1 })
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
      update.bio = bio.trim();
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

export default router;
