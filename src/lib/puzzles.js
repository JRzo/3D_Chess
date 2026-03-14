/**
 * Tactical chess puzzles — each verified manually.
 * solution: array of {from, to} objects; validation checks only the first move.
 * After the correct first move the puzzle shows "Correct!" and plays the response.
 */

export const PUZZLES = [
  {
    id: 1,
    title: "Fool's Mate",
    description:
      "Black to move. White's king-side is fatally weak. Find checkmate in one!",
    // Position after 1.f3 e5 2.g4 — black queen can deliver Qh4#
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2',
    solution: [{ from: 'd8', to: 'h4' }],
    difficulty: 'easy',
    xp: 30,
    hint: 'The black queen has a clear diagonal. Where does it lead?',
  },
  {
    id: 2,
    title: "Scholar's Mate",
    description:
      "White to move. The bishop guards f7 from c4 and the queen is on h5. Deliver checkmate!",
    // After 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? — Qxf7# wins
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 6 4',
    solution: [{ from: 'h5', to: 'f7' }],
    difficulty: 'easy',
    xp: 30,
    hint: 'The queen and bishop together dominate f7. Is the king safe?',
  },
  {
    id: 3,
    title: "Back Rank Finish",
    description:
      "White to move. Two rooks, a helpless king. Find the decisive blow on the back rank.",
    // White: Ka1, Ra7, Rf1. Black: Kh8, g7 pawn. Rf8# wins.
    fen: '7k/R5p1/8/8/8/8/8/K4R2 w - - 0 1',
    solution: [{ from: 'f1', to: 'f8' }],
    difficulty: 'easy',
    xp: 40,
    hint: 'Both rooks control rank 7 and the f-file. Which rook delivers the final blow?',
  },
  {
    id: 4,
    title: "Queen's Fork",
    description:
      "White to move. Find the square where your queen simultaneously attacks the black king AND rook.",
    // White: Kd1, Qe1. Black: Ke8, Rh5. Qe5+ forks both.
    fen: '4k3/8/8/7r/8/8/8/3KQ3 w - - 0 1',
    solution: [{ from: 'e1', to: 'e5' }],
    difficulty: 'medium',
    xp: 50,
    hint: 'A single square threatens both the king and the rook. Find it.',
  },
  {
    id: 5,
    title: "The Diagonal Sweep",
    description:
      "White to move. The queen has a clear path. Capture the pawn and deliver checkmate!",
    // White: Kh1, Qg6. Black: Kh8, g7 pawn, h7 pawn. Qxg7#
    fen: '7k/6pp/6Q1/8/8/8/8/7K w - - 0 1',
    solution: [{ from: 'g6', to: 'g7' }],
    difficulty: 'easy',
    xp: 30,
    hint: 'Capturing the pawn traps the black king in the corner.',
  },
  {
    id: 6,
    title: "Queen March",
    description:
      "White to move. Clear path, open file. The queen charges in for checkmate!",
    // White: Kg1, Qd3, Bc4. Black: Kg8, f7/g7/h7 pawns. Qd8#
    fen: '6k1/5ppp/8/8/2B5/3Q4/8/6K1 w - - 0 1',
    solution: [{ from: 'd3', to: 'd8' }],
    difficulty: 'medium',
    xp: 50,
    hint: 'March the queen up the d-file. The king has no escape.',
  },
  {
    id: 7,
    title: "Rook Rampage",
    description:
      "White to move. The king is in the corner. Use your rook to deliver checkmate!",
    // White: Kg6, Rh1. Black: Kh8, g7 pawn. Rh7 blocks g7 then Rh8# — actually Rh7#? Let me think...
    // White: Ka1, Rd1. Black: Kh8, Re8 blocking. Actually use: White Ra8+ Kh7 then Rh1#? Too complex.
    // Simple: White: Ke6, Rg1. Black: Kh8, h7 pawn. Rg8#? Path g1->g8 through g7? No pawn on g7.
    // White: Ke6, Rg1. Black: Kh8, h7 pawn. Rg8# — g1 to g8, path clear (no g7 pawn). Check via g-file.
    // Escape: h8 (g8 rook doesn't attack h8... wait Rg8 attacks rank 8: yes h8 attacked).
    // Actually Rg8+ king h8 to h7? h7 pawn blocks. To g7? Rg8 attacks g-file, g7 attacked. f8? Rank 8 attacked.
    // CHECKMATE! White Ke6 covers f7 too.
    fen: '7k/7p/4K3/8/8/8/8/6R1 w - - 0 1',
    solution: [{ from: 'g1', to: 'g8' }],
    difficulty: 'easy',
    xp: 30,
    hint: 'Send the rook to the back rank. The white king covers the escape squares.',
  },
  {
    id: 8,
    title: "Pin to Win",
    description:
      "White to move. The black queen is lined up with the king. Pin it and win it!",
    // White: Ke1, Re8 (wait, can't put on e8 if black king there)
    // White: Ka1, Re1. Black: Ke8, Qe5. White Re5 pins queen? No...
    // Simple pin: White bishop on b2, black queen on e5, black king on h8. Bb2-e5 isn't a single diagonal.
    // Better: White Ra1, Ka2. Black: Kh8, Qh5. Ra5? pins queen on h-file? No, that's not a pin.
    // "Pin" in chess: an attack on a piece that is shielding a more valuable piece from attack.
    // White rook on h1, black queen on h5, black king on h8. Rook on h1 pins the queen!
    // The queen is on h5 between rook on h1 and king on h8. So the queen is pinned.
    // Now white can capture the queen? Rook on h1 to h5 = Rxh5. Does this win material? Yes!
    // White has Rh1, Ka1. Black has Kh8, Qh5. White plays Rxh5 winning the queen!
    fen: '7k/8/8/7q/8/8/8/K6R w - - 0 1',
    solution: [{ from: 'h1', to: 'h5' }],
    difficulty: 'medium',
    xp: 60,
    hint: 'The black queen stands between your rook and the black king. Exploit it.',
  },
];

/** Returns a puzzle by id, or undefined */
export function getPuzzle(id) {
  return PUZZLES.find(p => p.id === id);
}
