/**
 * Tests for the double-move bug fix:
 * The player must not be able to move again while it is the bot's turn.
 *
 * We simulate the logic of handleSquareClick's guard conditions directly,
 * without rendering the full component, to verify the fix in isolation.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

/**
 * Simulates the guard at the top of handleSquareClick.
 * Returns true if the click is BLOCKED, false if it proceeds.
 */
function isClickBlocked({ isBotGame, chess, botTurnRef, botThinking, showGameOver, flagged }) {
  if (showGameOver || flagged) return true;
  // THE FIX: use chess.turn() (synchronous) and botTurnRef (ref, not state)
  if (isBotGame && (botTurnRef.current || chess.turn() !== 'w')) return true;
  if (botThinking) return true;
  return false;
}

describe('handleSquareClick bot-turn guard', () => {
  it('allows click on white\'s turn before any move', () => {
    const chess = new Chess();
    const botTurnRef = { current: false };
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: null })).toBe(false);
  });

  it('blocks click when botTurnRef.current is true (player just moved, awaiting bot)', () => {
    const chess = new Chess();
    chess.move('e4'); // white moved — chess.turn() is now 'b'
    const botTurnRef = { current: true }; // set immediately after player's move
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: null })).toBe(true);
  });

  it('blocks click when chess.turn() === "b" even if React state hasn\'t updated yet', () => {
    const chess = new Chess();
    chess.move('e4'); // chess object flipped to black's turn synchronously
    const botTurnRef = { current: false }; // ref not yet set (simulates old bug path)
    // The fix checks chess.turn() directly — this should still block
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: null })).toBe(true);
  });

  it('blocks click when botThinking is true', () => {
    const chess = new Chess();
    const botTurnRef = { current: false };
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: true, showGameOver: false, flagged: null })).toBe(true);
  });

  it('blocks click when game is over', () => {
    const chess = new Chess();
    const botTurnRef = { current: false };
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: true, flagged: null })).toBe(true);
  });

  it('blocks click when flagged (time out)', () => {
    const chess = new Chess();
    const botTurnRef = { current: false };
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: 'w' })).toBe(true);
  });

  it('allows click after bot has moved (botTurnRef reset + chess.turn() back to w)', () => {
    const chess = new Chess();
    chess.move('e4'); // player move
    chess.move('e5'); // bot move — chess.turn() back to 'w'
    const botTurnRef = { current: false }; // cleared after bot moved
    expect(isClickBlocked({ isBotGame: true, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: null })).toBe(false);
  });

  it('does not block in non-bot (2P) game even on black\'s turn', () => {
    const chess = new Chess();
    chess.move('e4'); // chess.turn() === 'b'
    const botTurnRef = { current: false };
    // isBotGame = false — both sides can click freely
    expect(isClickBlocked({ isBotGame: false, chess, botTurnRef, botThinking: false, showGameOver: false, flagged: null })).toBe(false);
  });
});
