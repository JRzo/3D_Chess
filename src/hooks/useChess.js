import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

export function useChess() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [history, setHistory] = useState([]);

  const refresh = useCallback(() => {
    const newFen = chess.fen();
    setFen(newFen);
    setHistory(chess.history({ verbose: true }));
    if (chess.isGameOver()) {
      const winner = chess.turn() === 'w' ? 'black' : 'white';
      let reason = 'draw';
      if (chess.isCheckmate()) reason = 'checkmate';
      else if (chess.isStalemate()) reason = 'stalemate';
      else if (chess.isInsufficientMaterial()) reason = 'insufficient material';
      else if (chess.isThreefoldRepetition()) reason = 'repetition';
      setGameOver({ winner, reason });
    }
    return newFen;
  }, [chess]);

  // Called by player clicking squares
  const selectSquare = useCallback((square) => {
    if (chess.isGameOver()) return null;

    // Execute move if we have a selected piece and clicked a valid destination
    if (selectedSquare && validMoves.includes(square)) {
      const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        setLastMove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setValidMoves([]);
        refresh();
        return move;
      }
    }

    // Select a piece
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      setValidMoves(chess.moves({ square, verbose: true }).map(m => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
    return null;
  }, [chess, selectedSquare, validMoves, refresh]);

  // Called programmatically (bot moves)
  const makeMove = useCallback((from, to, promotion = 'q') => {
    if (chess.isGameOver()) return null;
    try {
      const move = chess.move({ from, to, promotion });
      if (move) {
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        refresh();
        return move;
      }
    } catch {}
    return null;
  }, [chess, refresh]);

  const resetGame = useCallback(() => {
    chess.reset();
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setGameOver(null);
    setFen(chess.fen());
    setHistory([]);
  }, [chess]);

  const getPieces = useCallback(() => {
    const pieces = [];
    for (const file of FILES) {
      for (const rank of RANKS) {
        const sq = file + rank;
        const piece = chess.get(sq);
        if (piece) {
          pieces.push({
            square: sq,
            piece: piece.type,
            color: piece.color,
            col: FILES.indexOf(file),
            row: RANKS.indexOf(rank),
          });
        }
      }
    }
    return pieces;
  }, [fen]);  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    fen,
    selectedSquare,
    validMoves,
    lastMove,
    gameOver,
    history,
    selectSquare,
    makeMove,
    resetGame,
    getPieces,
    isCheck: chess.inCheck(),
    turn: chess.turn(),
    chess,
  };
}
