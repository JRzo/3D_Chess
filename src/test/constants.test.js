import { describe, it, expect } from 'vitest';
import {
  RANK_COLORS,
  RANK_ICONS,
  PIECE_SYM_B,
  PIECE_SYM_W,
  PIECE_MATERIAL,
  GAUNTLET_KEY,
  PUZZLES_KEY,
  rankColor,
  rankIcon,
} from '../lib/constants';
import { PUZZLES, getPuzzle } from '../lib/puzzles';

// ── constants.js ─────────────────────────────────────────────────────────────

describe('RANK_COLORS', () => {
  it('has all 5 rank tiers', () => {
    expect(Object.keys(RANK_COLORS)).toEqual(['Legend', 'Platinum', 'Gold', 'Silver', 'Bronze']);
  });

  it('all values are valid CSS hex colours', () => {
    for (const color of Object.values(RANK_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('RANK_ICONS', () => {
  it('has all 5 rank tiers', () => {
    expect(Object.keys(RANK_ICONS)).toEqual(['Legend', 'Platinum', 'Gold', 'Silver', 'Bronze']);
  });

  it('all values are non-empty strings', () => {
    for (const icon of Object.values(RANK_ICONS)) {
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});

describe('PIECE_SYM_B / PIECE_SYM_W', () => {
  const PIECE_TYPES = ['p', 'r', 'n', 'b', 'q', 'k'];

  it('PIECE_SYM_B has all 6 piece types', () => {
    expect(Object.keys(PIECE_SYM_B).sort()).toEqual(PIECE_TYPES.sort());
  });

  it('PIECE_SYM_W has all 6 piece types', () => {
    expect(Object.keys(PIECE_SYM_W).sort()).toEqual(PIECE_TYPES.sort());
  });

  it('symbols differ between black and white sets', () => {
    for (const t of PIECE_TYPES) {
      expect(PIECE_SYM_B[t]).not.toBe(PIECE_SYM_W[t]);
    }
  });
});

describe('PIECE_MATERIAL', () => {
  it('has all 6 piece types', () => {
    const PIECE_TYPES = ['p', 'r', 'n', 'b', 'q', 'k'];
    expect(Object.keys(PIECE_MATERIAL).sort()).toEqual(PIECE_TYPES.sort());
  });

  it('pawn = 1, knight = bishop = 3, rook = 5, queen = 9, king = 0', () => {
    expect(PIECE_MATERIAL.p).toBe(1);
    expect(PIECE_MATERIAL.n).toBe(3);
    expect(PIECE_MATERIAL.b).toBe(3);
    expect(PIECE_MATERIAL.r).toBe(5);
    expect(PIECE_MATERIAL.q).toBe(9);
    expect(PIECE_MATERIAL.k).toBe(0);
  });
});

describe('localStorage keys', () => {
  it('GAUNTLET_KEY is a non-empty string', () => {
    expect(typeof GAUNTLET_KEY).toBe('string');
    expect(GAUNTLET_KEY.length).toBeGreaterThan(0);
  });

  it('PUZZLES_KEY is a non-empty string', () => {
    expect(typeof PUZZLES_KEY).toBe('string');
    expect(PUZZLES_KEY.length).toBeGreaterThan(0);
  });

  it('keys are distinct', () => {
    expect(GAUNTLET_KEY).not.toBe(PUZZLES_KEY);
  });
});

describe('rankColor()', () => {
  it('returns the correct colour for known ranks', () => {
    expect(rankColor('Gold')).toBe(RANK_COLORS.Gold);
    expect(rankColor('Legend')).toBe(RANK_COLORS.Legend);
  });

  it('falls back to Bronze for unknown rank', () => {
    expect(rankColor('Unknown')).toBe(RANK_COLORS.Bronze);
    expect(rankColor(undefined)).toBe(RANK_COLORS.Bronze);
    expect(rankColor('')).toBe(RANK_COLORS.Bronze);
  });
});

describe('rankIcon()', () => {
  it('returns the correct icon for known ranks', () => {
    expect(rankIcon('Silver')).toBe(RANK_ICONS.Silver);
    expect(rankIcon('Platinum')).toBe(RANK_ICONS.Platinum);
  });

  it('falls back to Bronze icon for unknown rank', () => {
    expect(rankIcon('Unknown')).toBe(RANK_ICONS.Bronze);
    expect(rankIcon(null)).toBe(RANK_ICONS.Bronze);
  });
});

// ── puzzles.js ────────────────────────────────────────────────────────────────

describe('PUZZLES array', () => {
  it('contains 20 puzzles', () => {
    expect(PUZZLES.length).toBe(20);
  });

  it('IDs are 1-20 in order', () => {
    expect(PUZZLES.map(p => p.id)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
  });

  it('every puzzle has required fields', () => {
    for (const p of PUZZLES) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.title).toBe('string');
      expect(typeof p.fen).toBe('string');
      expect(Array.isArray(p.solution)).toBe(true);
      expect(p.solution.length).toBeGreaterThan(0);
      expect(typeof p.solution[0].from).toBe('string');
      expect(typeof p.solution[0].to).toBe('string');
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      expect(typeof p.xp).toBe('number');
      expect(p.xp).toBeGreaterThan(0);
    }
  });

  it('puzzle FENs are non-empty strings', () => {
    for (const p of PUZZLES) {
      expect(p.fen.split(' ').length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('getPuzzle()', () => {
  it('returns correct puzzle by id', () => {
    const p = getPuzzle(3);
    expect(p).toBeDefined();
    expect(p.id).toBe(3);
  });

  it('returns undefined for unknown id', () => {
    expect(getPuzzle(99)).toBeUndefined();
    expect(getPuzzle(0)).toBeUndefined();
  });
});

describe('Puzzle auto-advance navigation', () => {
  it('find-based lookup returns next puzzle for ids 1 through second-to-last', () => {
    for (let i = 1; i < PUZZLES.length; i++) {
      const current = PUZZLES.find(p => p.id === i);
      const next = PUZZLES.find(p => p.id === current.id + 1);
      expect(next).toBeDefined();
      expect(next.id).toBe(i + 1);
    }
  });

  it('find-based lookup returns undefined for the last puzzle', () => {
    const last = PUZZLES[PUZZLES.length - 1];
    const next = PUZZLES.find(p => p.id === last.id + 1);
    expect(next).toBeUndefined();
  });
});
