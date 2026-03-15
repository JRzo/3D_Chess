// ── Chess Bot Engine ────────────────────────────────────────────────────────
// 5 difficulty levels: Random → Greedy → Minimax 1-ply → 2-ply → 3-ply
// Includes quiescence search (levels 3-5) to avoid horizon effect.
// Includes a small opening book for natural early game play.

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
  // Endgame king table — more active king in endgame
  k_eg: [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
  ],
};

// ── Opening book ──────────────────────────────────────────────────────────────
// Keys are FEN positions (first 2 fields only: pieces + turn).
// Values are arrays of { from, to } moves to pick from randomly.
const OPENING_BOOK = {
  // Starting position — strong central pawn moves
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': [
    { from: 'e2', to: 'e4' }, { from: 'd2', to: 'd4' },
    { from: 'c2', to: 'c4' }, { from: 'g1', to: 'f3' },
  ],
  // After 1.e4 — Sicilian, French, Caro-Kann, Open Game
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': [
    { from: 'c7', to: 'c5' }, { from: 'e7', to: 'e5' },
    { from: 'e7', to: 'e6' }, { from: 'c7', to: 'c6' },
  ],
  // After 1.d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': [
    { from: 'd7', to: 'd5' }, { from: 'g8', to: 'f6' },
    { from: 'e7', to: 'e6' }, { from: 'f7', to: 'f5' },
  ],
  // 1.e4 e5 — Ruy Lopez, Italian, Scotch
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': [
    { from: 'g1', to: 'f3' }, { from: 'b1', to: 'c3' },
    { from: 'f1', to: 'c4' },
  ],
  // 1.e4 c5 — Sicilian: Open with Nf3
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': [
    { from: 'g1', to: 'f3' }, { from: 'b1', to: 'c3' },
  ],
  // 1.d4 d5 — Queen's Gambit
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w': [
    { from: 'c2', to: 'c4' }, { from: 'g1', to: 'f3' },
    { from: 'b1', to: 'c3' },
  ],
  // 1.e4 e5 2.Nf3 — best replies for black
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b': [
    { from: 'b8', to: 'c6' }, { from: 'g8', to: 'f6' },
  ],
  // 1.e4 e5 2.Nf3 Nc6 — Ruy Lopez or Italian
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
    { from: 'f1', to: 'b5' }, { from: 'f1', to: 'c4' },
    { from: 'd2', to: 'd4' },
  ],
};

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['1','2','3','4','5','6','7','8'];

function squareIndex(sq) {
  const file = FILES.indexOf(sq[0]);
  const rank = RANKS.indexOf(sq[1]);
  return rank * 8 + file;
}

/** Detect endgame: total non-pawn non-king material below threshold */
function isEndgame(chess) {
  let material = 0;
  for (const f of FILES) {
    for (const r of RANKS) {
      const p = chess.get(f + r);
      if (p && p.type !== 'k' && p.type !== 'p') {
        material += PIECE_VALUES[p.type] || 0;
      }
    }
  }
  return material < 2600; // roughly queen + minor piece each side
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'b' ? 100000 : -100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const endgame = isEndgame(chess);
  let score = 0;
  for (const file of FILES) {
    for (const rank of RANKS) {
      const sq = file + rank;
      const piece = chess.get(sq);
      if (!piece) continue;
      const idx = piece.color === 'w' ? squareIndex(sq) : 63 - squareIndex(sq);
      const pst = (piece.type === 'k' && endgame) ? PST.k_eg : PST[piece.type];
      const val = (PIECE_VALUES[piece.type] || 0) + (pst?.[idx] || 0);
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

/** Quiescence search — explores only captures to resolve tactical noise.
 *  Uses white-perspective scoring (same as evaluateBoard) for consistency.
 *  depth=2 means 2 ply of captures — enough to catch hanging pieces. */
function quiescence(chess, alpha, beta, maximizing, depth = 2) {
  const standPat = evaluateBoard(chess);

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }
  if (depth === 0) return standPat;

  const captures = chess.moves({ verbose: true }).filter(m => m.captured);
  if (!captures.length) return standPat;

  // MVV-LVA: prefer capturing high-value pieces with low-value attackers
  captures.sort((a, b) =>
    ((PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[b.piece] || 0)) -
    ((PIECE_VALUES[a.captured] || 0) - (PIECE_VALUES[a.piece] || 0))
  );

  if (maximizing) {
    let best = standPat;
    for (const move of captures) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, false, depth - 1);
      chess.undo();
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = standPat;
    for (const move of captures) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, true, depth - 1);
      chess.undo();
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function sortMoves(moves) {
  // Captures first (MVV-LVA), then promotions, then checks
  moves.sort((a, b) => {
    const av = a.captured ? (PIECE_VALUES[a.captured] || 0) + (a.promotion ? 800 : 0) : (a.promotion ? 600 : 0);
    const bv = b.captured ? (PIECE_VALUES[b.captured] || 0) + (b.promotion ? 800 : 0) : (b.promotion ? 600 : 0);
    return bv - av;
  });
}

function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0) return quiescence(chess, alpha, beta, maximizing);
  if (chess.isGameOver()) return evaluateBoard(chess);

  const moves = chess.moves({ verbose: true });
  sortMoves(moves);

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

/** Look up position in opening book using FEN prefix (pieces + side to move). */
function lookupOpeningBook(chess) {
  const fenParts = chess.fen().split(' ');
  const key = fenParts[0] + ' ' + fenParts[1];
  const bookMoves = OPENING_BOOK[key];
  if (!bookMoves) return null;
  // Filter to moves that are actually legal
  const legal = chess.moves({ verbose: true });
  const legalSet = new Set(legal.map(m => m.from + m.to));
  const valid = bookMoves.filter(m => legalSet.has(m.from + m.to));
  if (!valid.length) return null;
  return pickRandom(valid);
}

export function getBotMove(chess, difficulty) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  // Levels 3-5: use opening book
  if (difficulty >= 3) {
    const bookMove = lookupOpeningBook(chess);
    if (bookMove) return bookMove;
  }

  // difficulty: 1=random, 2=captures, 3=depth1+quiescence, 4=depth2+quiescence, 5=depth3+quiescence
  if (difficulty === 1) {
    return pickRandom(moves);
  }

  if (difficulty === 2) {
    const captures = moves.filter(m => m.captured);
    if (captures.length) {
      captures.sort((a, b) => (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[a.captured] || 0));
      return captures[0];
    }
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

  sortMoves(moves);

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
  if (difficulty === 3 && Math.random() < 0.12) return pickRandom(moves);
  return pickRandom(bestMoves);
}

/** Quick static evaluation for the eval bar (no search) */
export function getStaticEval(chess) {
  if (chess.isGameOver()) {
    if (chess.isCheckmate()) return chess.turn() === 'w' ? -999 : 999;
    return 0;
  }
  return evaluateBoard(chess) / 100; // return in pawn units
}

export const BOT_LEVELS = [
  { level: 1, name: 'Newbie',       elo: '~400',  icon: '🐣', color: '#6ee7b7', desc: 'Makes completely random moves. Perfect for beginners learning the rules.' },
  { level: 2, name: 'Beginner',     elo: '~700',  icon: '🐥', color: '#60a5fa', desc: 'Grabs free pieces but has no strategic planning.' },
  { level: 3, name: 'Casual',       elo: '~1000', icon: '🎓', color: '#a78bfa', desc: 'Plays real openings and thinks one move ahead.' },
  { level: 4, name: 'Intermediate', elo: '~1400', icon: '⚔️',  color: '#f59e0b', desc: 'Calculates 2 moves deep with quiescence search. Sets simple traps.' },
  { level: 5, name: 'Master',       elo: '~1800', icon: '👑', color: '#ef4444', desc: 'Looks 3 moves ahead with quiescence search and positional play. A real challenge.' },
];
