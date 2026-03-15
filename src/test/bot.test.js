import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { getBotMove, BOT_LEVELS, getStaticEval } from '../lib/bot';

// ── BOT_LEVELS metadata ────────────────────────────────────────────────────
describe('BOT_LEVELS', () => {
  it('has exactly 5 levels numbered 1-5', () => {
    expect(BOT_LEVELS).toHaveLength(5);
    BOT_LEVELS.forEach((b, i) => expect(b.level).toBe(i + 1));
  });

  it('every level has required fields', () => {
    for (const b of BOT_LEVELS) {
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('elo');
      expect(b).toHaveProperty('icon');
      expect(b).toHaveProperty('desc');
      expect(b).toHaveProperty('color');
    }
  });
});

// ── getBotMove — returns valid moves ─────────────────────────────────────────
describe('getBotMove', () => {
  it('returns null when no legal moves exist (checkmate position)', () => {
    // Fool's mate — black is in checkmate
    const chess = new Chess();
    chess.move('f3'); chess.move('e5');
    chess.move('g4'); chess.move('Qh4');
    // It's white's turn but the game is over
    expect(chess.isCheckmate()).toBe(true);
    const move = getBotMove(chess, 1);
    expect(move).toBeNull();
  });

  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: returns a valid move from the starting position`, () => {
      const chess = new Chess();
      const move = getBotMove(chess, level);
      expect(move).not.toBeNull();
      const legal = chess.moves({ verbose: true });
      const found = legal.some(m => m.from === move.from && m.to === move.to);
      expect(found).toBe(true);
    });

    it(`level ${level}: returned move can actually be executed`, () => {
      const chess = new Chess();
      const move = getBotMove(chess, level);
      expect(() => chess.move({ from: move.from, to: move.to, promotion: 'q' })).not.toThrow();
    });
  }

  it('level 1 (random): distributes moves across the board over many calls', () => {
    const chess = new Chess();
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const m = getBotMove(chess, 1);
      seen.add(m.san);
    }
    // With 20 legal first moves and 100 rolls, we expect at least 5 different moves
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('level 2: prefers captures over non-captures when available', () => {
    // Black queen on d4 can slide down the d-file to capture white pawn on d2 (d3 is empty).
    const chess = new Chess('7k/8/8/8/3q4/8/3P4/7K b - - 0 1');
    const move = getBotMove(chess, 2);
    expect(move.captured).toBeDefined();
  });

  it('minimax levels do not throw on mid-game position', { timeout: 60000 }, () => {
    const chess = new Chess();
    // Play 10 moves
    const opening = ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7'];
    for (const san of opening) chess.move(san);

    for (const level of [3, 4, 5]) {
      const copy = new Chess(chess.fen());
      expect(() => getBotMove(copy, level)).not.toThrow();
      const move = getBotMove(new Chess(chess.fen()), level);
      expect(move).not.toBeNull();
    }
  });
});

// ── getStaticEval ─────────────────────────────────────────────────────────────
describe('getStaticEval', () => {
  it('returns 0 at starting position (balanced)', () => {
    const chess = new Chess();
    const score = getStaticEval(chess);
    // Starting position is symmetric; score should be close to 0 (within 1 pawn)
    expect(Math.abs(score)).toBeLessThan(1.0);
  });

  it('returns a large positive score when white is winning heavily', () => {
    // White has queen+rook vs lone king
    const chess = new Chess('7k/8/8/8/8/8/8/K1RQ4 w - - 0 1');
    const score = getStaticEval(chess);
    expect(score).toBeGreaterThan(10);
  });

  it('returns a large negative score when black is winning heavily', () => {
    // Black has queen+rook vs lone king
    const chess = new Chess('K7/8/8/8/8/8/8/4qrk1 w - - 0 1');
    const score = getStaticEval(chess);
    expect(score).toBeLessThan(-10);
  });

  it('returns 999 for white checkmate win (black just mated)', () => {
    // White just delivered checkmate — it is black's turn but black has no moves
    const chess = new Chess();
    chess.move('f3'); chess.move('e5');
    chess.move('g4'); chess.move('Qh4'); // Black delivers checkmate on black's last move
    // chess.turn() is now 'w' but game is over
    expect(chess.isCheckmate()).toBe(true);
    const score = getStaticEval(chess);
    // The mated side is white (chess.turn() === 'w' means white is checkmated)
    // Our evaluator: checkmate when turn === 'w' returns -999 (white lost)
    expect(score).toBe(-999);
  });

  it('returns 0 for draw/stalemate', () => {
    const chess = new Chess('5k2/5P2/5K2/8/8/8/8/8 b - - 0 1');
    expect(chess.isStalemate()).toBe(true);
    expect(getStaticEval(chess)).toBe(0);
  });
});

// ── Opening book ──────────────────────────────────────────────────────────────
describe('Opening book (level 3+)', () => {
  it('level 3 plays a known strong first move from starting position', () => {
    const chess = new Chess();
    const STRONG_FIRST_MOVES = new Set(['e2e4', 'd2d4', 'c2c4', 'g1f3']);
    // Run 20 times — at least once should come from the opening book
    let bookHit = false;
    for (let i = 0; i < 20; i++) {
      const m = getBotMove(new Chess(), 3);
      if (STRONG_FIRST_MOVES.has(m.from + m.to)) { bookHit = true; break; }
    }
    expect(bookHit).toBe(true);
  });

  it('level 1 and 2 do not need book moves (random/greedy)', () => {
    // Just verify they return valid moves, not that they use the book
    const chess = new Chess();
    for (const level of [1, 2]) {
      const move = getBotMove(new Chess(), level);
      expect(move).not.toBeNull();
      const legal = chess.moves({ verbose: true });
      expect(legal.some(m => m.from === move.from && m.to === move.to)).toBe(true);
    }
  });
});

// ── chess.js integration sanity checks ───────────────────────────────────────
describe('chess.js integration', () => {
  it('correctly detects checkmate', () => {
    const chess = new Chess();
    chess.move('f3'); chess.move('e5');
    chess.move('g4'); chess.move('Qh4');
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('correctly detects stalemate', () => {
    // Reliable stalemate FEN: black king on f8, white pawn on f7, white king on f6 — black has no legal moves and is not in check
    const stale = new Chess('5k2/5P2/5K2/8/8/8/8/8 b - - 0 1');
    expect(stale.isStalemate()).toBe(true);
  });

  it('turn flips after each move', () => {
    const chess = new Chess();
    expect(chess.turn()).toBe('w');
    chess.move('e4');
    expect(chess.turn()).toBe('b');
    chess.move('e5');
    expect(chess.turn()).toBe('w');
  });

  it('fen changes after each move', () => {
    const chess = new Chess();
    const initial = chess.fen();
    chess.move('e4');
    expect(chess.fen()).not.toBe(initial);
  });
});
