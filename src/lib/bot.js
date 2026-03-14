// ── Chess Bot Engine ────────────────────────────────────────────────────────
// 5 difficulty levels: Random → Greedy → Minimax 1-ply → 2-ply → 3-ply
// Uses piece-square tables for positional awareness at higher levels.

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables (from white's perspective, rank 1 = index 0)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

function squareIndex(sq) {
  const file = FILES.indexOf(sq[0]);
  const rank = RANKS.indexOf(sq[1]);
  return rank * 8 + file;
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'b' ? 100000 : -100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  for (const file of FILES) {
    for (const rank of RANKS) {
      const sq = file + rank;
      const piece = chess.get(sq);
      if (!piece) continue;
      const idx = piece.color === 'w' ? squareIndex(sq) : 63 - squareIndex(sq);
      const val = (PIECE_VALUES[piece.type] || 0) + (PST[piece.type]?.[idx] || 0);
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess);

  const moves = chess.moves({ verbose: true });
  // Sort: captures first (MVV-LVA approximation)
  moves.sort((a, b) => {
    const av = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
    const bv = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
    return bv - av;
  });

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Add small delay so the UI can update before bot thinks
export function getBotMove(chess, difficulty) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  // difficulty: 1=random, 2=captures, 3=depth1, 4=depth2, 5=depth3
  if (difficulty === 1) {
    return pickRandom(moves);
  }

  if (difficulty === 2) {
    const captures = moves.filter(m => m.captured);
    if (captures.length) {
      // pick highest-value capture
      captures.sort((a, b) => (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[a.captured] || 0));
      return captures[0];
    }
    // Avoid moving into check
    const safe = moves.filter(m => {
      chess.move(m);
      const inDanger = chess.inCheck();
      chess.undo();
      return !inDanger;
    });
    return pickRandom(safe.length ? safe : moves);
  }

  const depth = difficulty === 3 ? 1 : difficulty === 4 ? 2 : 3;
  const isMaximizing = chess.turn() === 'w';
  let best = isMaximizing ? -Infinity : Infinity;
  let bestMoves = [];

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
    chess.undo();
    if (isMaximizing ? score > best : score < best) {
      best = score;
      bestMoves = [move];
    } else if (score === best) {
      bestMoves.push(move);
    }
  }

  // Add slight randomness at difficulty 3 to feel more human
  if (difficulty === 3 && Math.random() < 0.15) return pickRandom(moves);
  return pickRandom(bestMoves);
}

export const BOT_LEVELS = [
  { level: 1, name: 'Newbie',       elo: '~400',  icon: '🐣', color: '#6ee7b7', desc: 'Makes completely random moves. Perfect for beginners learning the rules.' },
  { level: 2, name: 'Beginner',     elo: '~700',  icon: '🐥', color: '#60a5fa', desc: 'Grabs free pieces but has no strategic planning.' },
  { level: 3, name: 'Casual',       elo: '~1000', icon: '🎓', color: '#a78bfa', desc: 'Thinks one move ahead. Will put up a decent fight.' },
  { level: 4, name: 'Intermediate', elo: '~1400', icon: '⚔️',  color: '#f59e0b', desc: 'Calculates 2 moves deep. Defends pieces and sets simple traps.' },
  { level: 5, name: 'Master',       elo: '~1800', icon: '👑', color: '#ef4444', desc: 'Looks 3 moves ahead with positional awareness. A real challenge.' },
];
