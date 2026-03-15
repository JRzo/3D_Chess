import express from 'express';
import { isValidObjectId } from 'mongoose';
import { Chess } from 'chess.js';
import Game from '../models/Game.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const STARTING_FEN   = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const VALID_RESULTS  = new Set(['white', 'black', 'draw']);
const SQUARE_RE      = /^[a-h][1-8]$/;
const PROMO_RE       = /^[qrbn]$/;
const VALID_TIME_CONTROLS = new Set([60, 120, 180, 300, 600, 900, 1800, 0]);

// ELO constants
const K_FACTOR = 32;
const BOT_ELOS = { 1: 800, 2: 1000, 3: 1200, 4: 1400, 5: 1600 };

function calcElo(playerElo, opponentElo, actual) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(playerElo + K_FACTOR * (actual - expected));
}

router.post('/', authenticate, async (req, res) => {
  try {
    const rawTime = Number(req.body.timeControl);
    const timeControl = VALID_TIME_CONTROLS.has(rawTime) ? rawTime : 600;

    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: 'User not found' });

    const game = new Game({
      white: req.userId,
      whiteUsername: me.username,
      blackUsername: 'AI',
      timeControl,
      status: 'active',
      fen: STARTING_FEN,
    });
    await game.save();
    res.status(201).json(game);
  } catch (err) {
    console.error('POST /games error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId))
      return res.status(400).json({ message: 'Invalid user ID' });

    const games = await Game.find({
      $or: [{ white: req.params.userId }, { black: req.params.userId }],
      status: 'completed',
    }).sort({ completedAt: -1 }).limit(10);
    res.json(games);
  } catch (err) {
    console.error('GET /games/user/:userId error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid game ID' });

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json(game);
  } catch (err) {
    console.error('GET /games/:id error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

router.post('/:id/moves', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid game ID' });

    const { from, to, promotion } = req.body;

    if (!SQUARE_RE.test(from) || !SQUARE_RE.test(to))
      return res.status(400).json({ message: 'Invalid move squares' });

    if (promotion !== undefined && !PROMO_RE.test(promotion))
      return res.status(400).json({ message: 'Invalid promotion piece' });

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (game.white?.toString() !== req.userId)
      return res.status(403).json({ message: 'Forbidden' });

    if (game.status !== 'active')
      return res.status(409).json({ message: 'Game is not active' });

    // Server-side move validation — reconstruct position from authoritative FEN
    const chess = new Chess(game.fen || STARTING_FEN);
    let validated;
    try {
      validated = chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      validated = null;
    }
    if (!validated) return res.status(400).json({ message: 'Illegal move' });

    // Store server-computed values, never trust client-provided FEN/SAN
    game.moves.push({
      from:  validated.from,
      to:    validated.to,
      piece: validated.piece,
      san:   validated.san,
      fen:   chess.fen(),
    });
    game.fen = chess.fen();
    await game.save();
    res.json(game);
  } catch (err) {
    console.error('POST /games/:id/moves error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Legend'];
function calcRank(level) {
  if (level >= 35) return 'Legend';
  if (level >= 20) return 'Platinum';
  if (level >= 10) return 'Gold';
  if (level >= 5)  return 'Silver';
  return 'Bronze';
}

function checkAchievements(user, { won, drew }) {
  const has = (name) => user.achievements.some(a => a.name === name);
  const pending = [];

  // Milestone: first game
  if (user.stats.totalGames === 1 && !has('First Move'))      pending.push('First Move');
  // Win milestones
  if (won) {
    if (user.stats.wins === 1   && !has('First Win'))         pending.push('First Win');
    if (user.stats.wins === 10  && !has('Ten Wins'))          pending.push('Ten Wins');
    if (user.stats.wins === 50  && !has('Fifty Wins'))        pending.push('Fifty Wins');
    if (user.stats.wins === 100 && !has('Century'))           pending.push('Century');
  }
  // Draw
  if (drew && user.stats.draws === 1 && !has('Diplomat'))     pending.push('Diplomat');
  // Games played
  if (user.stats.totalGames === 10  && !has('Getting Started'))  pending.push('Getting Started');
  if (user.stats.totalGames === 50  && !has('Regular Player'))   pending.push('Regular Player');
  if (user.stats.totalGames === 100 && !has('Centurion'))        pending.push('Centurion');
  if (user.stats.totalGames === 500 && !has('Veteran'))          pending.push('Veteran');
  // Win streaks
  if (user.currentWinStreak >= 3  && !has('Hat Trick'))       pending.push('Hat Trick');
  if (user.currentWinStreak >= 5  && !has('Hot Streak'))      pending.push('Hot Streak');
  if (user.currentWinStreak >= 10 && !has('Unstoppable'))     pending.push('Unstoppable');
  // ELO milestones (checked after ELO update)
  if (user.elo >= 1300 && !has('Rising Star'))                pending.push('Rising Star');
  if (user.elo >= 1500 && !has('Expert'))                     pending.push('Expert');
  if (user.elo >= 1800 && !has('Master'))                     pending.push('Master');
  if (user.elo >= 2000 && !has('Grandmaster'))                pending.push('Grandmaster');

  return pending;
}

async function applyGameRewards(userId, { won, drew, botLevel }) {
  const user = await User.findById(userId);
  if (!user) return { user: null, newAchievements: [], eloChange: 0 };

  user.stats.totalGames++;
  if (won)       user.stats.wins++;
  else if (drew) user.stats.draws++;
  else           user.stats.losses++;

  // Win streak
  if (won) {
    user.currentWinStreak = (user.currentWinStreak || 0) + 1;
    if (user.currentWinStreak > (user.bestWinStreak || 0)) {
      user.bestWinStreak = user.currentWinStreak;
    }
  } else {
    user.currentWinStreak = 0;
  }

  // XP + level
  const xpGain = won ? 200 : drew ? 75 : 25;
  user.stats.xp += xpGain;
  while (user.stats.xp >= user.stats.level * 100) {
    user.stats.xp -= user.stats.level * 100;
    user.stats.level++;
    const lvlAch = `Reached Level ${user.stats.level}`;
    if (!user.achievements.some(a => a.name === lvlAch)) {
      user.achievements.push({ name: lvlAch });
    }
  }
  user.stats.rank = calcRank(user.stats.level);

  // ELO
  const opponentElo = BOT_ELOS[botLevel] || 1200;
  const actual = won ? 1 : drew ? 0.5 : 0;
  const oldElo = user.elo || 1200;
  user.elo = Math.max(100, calcElo(oldElo, opponentElo, actual));
  const eloChange = user.elo - oldElo;

  // Achievements (checked after stats/elo updated)
  const newAchievements = checkAchievements(user, { won, drew });
  newAchievements.forEach(name => user.achievements.push({ name }));

  await user.save();
  return { user, newAchievements, eloChange };
}

router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid game ID' });

    const { result, resultReason, pgn, botLevel } = req.body;

    if (!VALID_RESULTS.has(result))
      return res.status(400).json({ message: 'Invalid result value' });

    if (resultReason !== undefined && (typeof resultReason !== 'string' || resultReason.length > 50))
      return res.status(400).json({ message: 'Invalid resultReason' });

    if (pgn !== undefined && (typeof pgn !== 'string' || pgn.length > 5000))
      return res.status(400).json({ message: 'Invalid PGN' });

    const safeBotLevel = Number.isInteger(botLevel) && botLevel >= 0 && botLevel <= 5 ? botLevel : 0;

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (game.white?.toString() !== req.userId)
      return res.status(403).json({ message: 'Forbidden' });

    if (game.status === 'completed')
      return res.status(409).json({ message: 'Game already completed' });

    // Server-side result verification for checkmate/stalemate/draw
    const isConcession = resultReason === 'resignation' || resultReason === 'timeout';
    if (!isConcession) {
      const chess = new Chess(game.fen || STARTING_FEN);
      if (!chess.isGameOver()) {
        return res.status(400).json({ message: 'Game is not over in the stored position' });
      }
      let expectedResult;
      if (chess.isCheckmate())   expectedResult = chess.turn() === 'w' ? 'black' : 'white';
      else if (chess.isDraw())   expectedResult = 'draw';
      if (expectedResult && expectedResult !== result) {
        return res.status(400).json({ message: 'Result does not match game state' });
      }
    }

    game.result = result;
    game.resultReason = resultReason;
    game.pgn = pgn;
    game.status = 'completed';
    game.completedAt = new Date();
    await game.save();

    const won  = result === 'white';
    const drew = result === 'draw';
    const { user: updatedUser, newAchievements, eloChange } =
      await applyGameRewards(req.userId, { won, drew, botLevel: safeBotLevel });

    res.json({ game, user: updatedUser, newAchievements, eloChange });
  } catch (err) {
    console.error('POST /games/:id/complete error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

export default router;
