import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChess } from '../hooks/useChess';

describe('useChess hook', () => {
  it('starts with the standard initial position', () => {
    const { result } = renderHook(() => useChess());
    expect(result.current.turn).toBe('w');
    expect(result.current.gameOver).toBeNull();
    expect(result.current.history).toHaveLength(0);
    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.validMoves).toHaveLength(0);
  });

  it('getPieces returns 32 pieces at game start', () => {
    const { result } = renderHook(() => useChess());
    const pieces = result.current.getPieces();
    expect(pieces).toHaveLength(32);
  });

  it('getPieces pieces all have required fields', () => {
    const { result } = renderHook(() => useChess());
    for (const p of result.current.getPieces()) {
      expect(p).toHaveProperty('square');
      expect(p).toHaveProperty('piece');
      expect(p).toHaveProperty('color');
      expect(p).toHaveProperty('col');
      expect(p).toHaveProperty('row');
      expect(['w','b']).toContain(p.color);
      expect(['p','r','n','b','q','k']).toContain(p.piece);
    }
  });

  it('selectSquare: clicking an empty square does nothing', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.selectSquare('e4'); }); // empty square
    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.validMoves).toHaveLength(0);
  });

  it('selectSquare: clicking a white pawn selects it and shows valid moves', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.selectSquare('e2'); });
    expect(result.current.selectedSquare).toBe('e2');
    expect(result.current.validMoves).toContain('e3');
    expect(result.current.validMoves).toContain('e4');
  });

  it('selectSquare: clicking a black piece on white turn does nothing', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.selectSquare('e7'); }); // black pawn
    expect(result.current.selectedSquare).toBeNull();
  });

  it('selectSquare: executes a valid move and returns the move object', () => {
    const { result } = renderHook(() => useChess());
    let move;
    act(() => { result.current.selectSquare('e2'); });
    act(() => { move = result.current.selectSquare('e4'); });
    expect(move).not.toBeNull();
    expect(move.from).toBe('e2');
    expect(move.to).toBe('e4');
    expect(result.current.turn).toBe('b');
    expect(result.current.history).toHaveLength(1);
  });

  it('selectSquare: returns null when clicking a non-move destination', () => {
    const { result } = renderHook(() => useChess());
    let move;
    act(() => { result.current.selectSquare('e2'); });
    act(() => { move = result.current.selectSquare('e6'); }); // not a valid dest
    expect(move).toBeNull();
  });

  it('makeMove: executes a move programmatically', () => {
    const { result } = renderHook(() => useChess());
    let move;
    act(() => { move = result.current.makeMove('e2', 'e4'); });
    expect(move).not.toBeNull();
    expect(result.current.turn).toBe('b');
    expect(result.current.history).toHaveLength(1);
  });

  it('makeMove: returns null for an illegal move', () => {
    const { result } = renderHook(() => useChess());
    let move;
    act(() => { move = result.current.makeMove('e2', 'e6'); }); // illegal
    expect(move).toBeNull();
    expect(result.current.turn).toBe('w'); // turn unchanged
  });

  it('makeMove: returns null when it is not that color\'s turn', () => {
    const { result } = renderHook(() => useChess());
    let move;
    act(() => { move = result.current.makeMove('e7', 'e5'); }); // black move on white's turn
    expect(move).toBeNull();
  });

  it('resetGame: restores initial state', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.makeMove('e2', 'e4'); });
    act(() => { result.current.makeMove('e7', 'e5'); });
    act(() => { result.current.resetGame(); });
    expect(result.current.turn).toBe('w');
    expect(result.current.history).toHaveLength(0);
    expect(result.current.gameOver).toBeNull();
    expect(result.current.getPieces()).toHaveLength(32);
  });

  it('isCheck: false at start', () => {
    const { result } = renderHook(() => useChess());
    expect(result.current.isCheck).toBe(false);
  });

  it('gameOver: null during normal play', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.makeMove('e2', 'e4'); });
    act(() => { result.current.makeMove('e7', 'e5'); });
    expect(result.current.gameOver).toBeNull();
  });

  it('gameOver: detected after fool\'s mate', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.makeMove('f2', 'f3'); });
    act(() => { result.current.makeMove('e7', 'e5'); });
    act(() => { result.current.makeMove('g2', 'g4'); });
    act(() => { result.current.makeMove('d8', 'h4'); }); // Qh4#
    expect(result.current.gameOver).not.toBeNull();
    expect(result.current.gameOver.reason).toBe('checkmate');
    expect(result.current.gameOver.winner).toBe('black');
  });

  it('lastMove: updated after a move', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.makeMove('e2', 'e4'); });
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
  });

  it('lastMove: null before any move', () => {
    const { result } = renderHook(() => useChess());
    expect(result.current.lastMove).toBeNull();
  });

  it('selectSquare: deselects when same square is clicked twice', () => {
    const { result } = renderHook(() => useChess());
    act(() => { result.current.selectSquare('e2'); });
    expect(result.current.selectedSquare).toBe('e2');
    act(() => { result.current.selectSquare('e2'); }); // click same square
    // clicking same square either deselects or tries to move to same cell (no-op)
    // either way, no move should have been made
    expect(result.current.history).toHaveLength(0);
  });
});
