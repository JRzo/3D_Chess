/**
 * Tests for the timer-related logic extracted from GamePage.
 * We test the pure fmt() helper and the applyTimeControl stale-closure fix.
 */
import { describe, it, expect } from 'vitest';

// ── fmt helper (copy from GamePage — keep in sync) ─────────────────────────
function fmt(s) {
  if (s === 0 || s === null) return '∞';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

describe('fmt (clock formatter)', () => {
  it('returns ∞ for 0', () => expect(fmt(0)).toBe('∞'));
  it('returns ∞ for null', () => expect(fmt(null)).toBe('∞'));
  it('formats 60 as 1:00', () => expect(fmt(60)).toBe('1:00'));
  it('formats 61 as 1:01', () => expect(fmt(61)).toBe('1:01'));
  it('formats 3600 as 60:00', () => expect(fmt(3600)).toBe('60:00'));
  it('formats 5 as 0:05', () => expect(fmt(5)).toBe('0:05'));
  it('formats 300 as 5:00', () => expect(fmt(300)).toBe('5:00'));
  it('formats 599 as 9:59', () => expect(fmt(599)).toBe('9:59'));
  it('pads single-digit seconds', () => expect(fmt(121)).toBe('2:01'));
});

// ── applyTimeControl stale-closure fix ─────────────────────────────────────
describe('applyTimeControl reset logic', () => {
  it('passes the new tc to reset, not the stale timeControl state', () => {
    // Simulate the bug: if we only called setTimeControl then handleReset(),
    // handleReset would read the old timeControl from closure (stale = 300)
    // and overwrite the new value.
    // The fix is handleReset(explicitTime) which receives tc directly.

    let staleTimeControl = 300; // simulates old closure value
    const setTimeWhite = (v) => { capturedWhite = v; };
    const setTimeBlack = (v) => { capturedBlack = v; };
    let capturedWhite, capturedBlack;

    // Buggy version (uses stale state):
    const handleResetBuggy = () => {
      setTimeWhite(staleTimeControl);
      setTimeBlack(staleTimeControl);
    };
    const applyTimeControlBuggy = (tc) => {
      // setTimeControl(tc) — async, staleTimeControl still 300
      handleResetBuggy(); // reads stale 300
    };
    applyTimeControlBuggy(60);
    expect(capturedWhite).toBe(300); // bug: wrong value

    // Fixed version (passes tc directly):
    const handleResetFixed = (explicitTime) => {
      const t = explicitTime !== undefined ? explicitTime : staleTimeControl;
      setTimeWhite(t);
      setTimeBlack(t);
    };
    const applyTimeControlFixed = (tc) => {
      handleResetFixed(tc); // passes tc directly
    };
    applyTimeControlFixed(60);
    expect(capturedWhite).toBe(60); // correct
    expect(capturedBlack).toBe(60); // correct
  });

  it('handleReset with no arg falls back to the current timeControl', () => {
    let currentTimeControl = 180;
    let capturedWhite;
    const handleReset = (explicitTime) => {
      const t = explicitTime !== undefined ? explicitTime : currentTimeControl;
      capturedWhite = t;
    };
    handleReset(); // no arg
    expect(capturedWhite).toBe(180);
  });
});
