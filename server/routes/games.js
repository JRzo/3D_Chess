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
const VALID_TIME_CONTROLS = new Set([60, 180, 300, 600, 900, 1800, 0]);

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

async function applyXP(userId, xpGain, won, drew) {
  const user = await User.findById(userId);
  if (!user) return;
  user.stats.totalGames++;
  if (won)       user.stats.wins++;
  else if (drew) user.stats.draws++;
  else           user.stats.losses++;

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
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'Invalid game ID' });

    const { result, resultReason, pgn } = req.body;

    if (!VALID_RESULTS.has(result))
      return res.status(400).json({ message: 'Invalid result value' });

    if (resultReason !== undefined && (typeof resultReason !== 'string' || resultReason.length > 50))
      return res.status(400).json({ message: 'Invalid resultReason' });

    if (pgn !== undefined && (typeof pgn !== 'string' || pgn.length > 5000))
      return res.status(400).json({ message: 'Invalid PGN' });

    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (game.white?.toString() !== req.userId)
      return res.status(403).json({ message: 'Forbidden' });

    if (game.status === 'completed')
      return res.status(409).json({ message: 'Game already completed' });

    // Server-side result verification for checkmate/stalemate/draw
    // Resignation and timeout are trusted (player chose to concede)
    const isConcession = resultReason === 'resignation' || resultReason === 'timeout';
    if (!isConcession) {
      const chess = new Chess(game.fen || STARTING_FEN);
      if (!chess.isGameOver()) {
        return res.status(400).json({ message: 'Game is not over in the stored position' });
      }
      // Verify claimed result matches actual outcome
      let expectedResult;
      if (chess.isCheckmate())     expectedResult = chess.turn() === 'w' ? 'black' : 'white';
      else if (chess.isDraw())     expectedResult = 'draw';
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

    let updatedUser = null;
    if (result === 'white')      updatedUser = await applyXP(req.userId, 200, true,  false);
    else if (result === 'black') updatedUser = await applyXP(req.userId,  25, false, false);
    else if (result === 'draw')  updatedUser = await applyXP(req.userId,  75, false, true);

    res.json({ game, user: updatedUser });
  } catch (err) {
    console.error('POST /games/:id/complete error:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

export default router;
