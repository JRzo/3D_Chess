import express from 'express';
import Game from '../models/Game.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { timeControl } = req.body;
    const me = await User.findById(req.userId);
    const game = new Game({
      white: req.userId,
      whiteUsername: me.username,
      blackUsername: 'AI',
      timeControl: timeControl || 600,
      status: 'active',
    });
    await game.save();
    res.status(201).json(game);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const games = await Game.find({
      $or: [{ white: req.params.userId }, { black: req.params.userId }],
      status: 'completed',
    }).sort({ completedAt: -1 }).limit(10);
    res.json(games);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/moves', authenticate, async (req, res) => {
  try {
    const { from, to, piece, san, fen } = req.body;
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    game.moves.push({ from, to, piece, san, fen });
    game.fen = fen;
    await game.save();
    res.json(game);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const RANKS = ['Bronze','Silver','Gold','Platinum','Legend'];
function calcRank(level) {
  if (level >= 35) return 'Legend';
  if (level >= 20) return 'Platinum';
  if (level >= 10) return 'Gold';
  if (level >= 5) return 'Silver';
  return 'Bronze';
}

async function applyXP(userId, xpGain, won, drew) {
  const user = await User.findById(userId);
  if (!user) return;
  user.stats.totalGames++;
  if (won) user.stats.wins++;
  else if (drew) user.stats.draws++;
  else user.stats.losses++;

  user.stats.xp += xpGain;
  while (user.stats.xp >= user.stats.level * 100) {
    user.stats.xp -= user.stats.level * 100;
    user.stats.level++;
    const achievementName = `Reached Level ${user.stats.level}`;
    if (!user.achievements.find(a => a.name === achievementName)) {
      user.achievements.push({ name: achievementName });
    }
  }
  user.stats.rank = calcRank(user.stats.level);
  await user.save();
  return user;
}

router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { result, resultReason, pgn } = req.body;
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    game.result = result;
    game.resultReason = resultReason;
    game.pgn = pgn;
    game.status = 'completed';
    game.completedAt = new Date();
    await game.save();

    let updatedUser = null;
    if (result === 'white') {
      updatedUser = await applyXP(game.white, 200, true, false);
    } else if (result === 'black') {
      updatedUser = await applyXP(game.white, 25, false, false);
    } else if (result === 'draw') {
      updatedUser = await applyXP(game.white, 75, false, true);
    }

    res.json({ game, user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
