import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundManager } from '../lib/sounds';

// Mock the Web Audio API (not available in jsdom)
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
};
const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};
let mockContext;

describe('soundManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn(),
    };
    global.AudioContext = vi.fn(function() { return mockContext; });
    soundManager.ctx = null;  // force re-init
    soundManager.enabled = true;
  });

  it('does not throw when playing known sound types', () => {
    const types = ['move', 'capture', 'check', 'checkmate', 'select', 'levelup', 'invalid'];
    for (const t of types) {
      expect(() => soundManager.play(t)).not.toThrow();
    }
  });

  it('does not throw for unknown sound type (uses fallback)', () => {
    expect(() => soundManager.play('unknown_type_xyz')).not.toThrow();
  });

  it('does not play when enabled is false', () => {
    soundManager.enabled = false;
    soundManager.play('move');
    expect(mockContext.createOscillator).not.toHaveBeenCalled();
  });

  it('initialises AudioContext on first play', () => {
    soundManager.play('move');
    expect(global.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('reuses the same AudioContext across multiple plays', () => {
    soundManager.play('move');
    const ctxAfterFirst = soundManager.ctx;
    soundManager.play('capture');
    // ctx should be the same object — no new context created
    expect(soundManager.ctx).toBe(ctxAfterFirst);
    expect(soundManager.ctx).not.toBeNull();
  });
});
