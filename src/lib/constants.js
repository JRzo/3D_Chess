// ── Shared constants used across multiple pages/components ────────────────

export const RANK_COLORS = {
  Legend:   '#a855f7',
  Platinum: '#38bdf8',
  Gold:     '#f59e0b',
  Silver:   '#c0c0c0',
  Bronze:   '#cd7f32',
};

export const RANK_ICONS = {
  Legend:   '👑',
  Platinum: '💎',
  Gold:     '🥇',
  Silver:   '🥈',
  Bronze:   '🥉',
};

// Unicode symbols for piece display in move history / captured pieces
export const PIECE_SYM_B = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
export const PIECE_SYM_W = { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' };

// Point values for material advantage display (in pawns)
export const PIECE_MATERIAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const GAUNTLET_KEY = 'chess3d-gauntlet';
export const PUZZLES_KEY  = 'chess3d-puzzles';

/** Returns the rank color, falling back to Bronze. */
export function rankColor(rank) {
  return RANK_COLORS[rank] || RANK_COLORS.Bronze;
}

/** Returns the rank icon, falling back to Bronze. */
export function rankIcon(rank) {
  return RANK_ICONS[rank] || RANK_ICONS.Bronze;
}
