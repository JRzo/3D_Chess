class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _init() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this._init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const configs = {
        move:      { freq: 440, type: 'sine',     dur: 0.08 },
        capture:   { freq: 180, type: 'sawtooth', dur: 0.18 },
        check:     { freq: 660, type: 'sine',     dur: 0.25 },
        checkmate: { freq: 880, type: 'square',   dur: 0.5  },
        select:    { freq: 520, type: 'sine',     dur: 0.05 },
        levelup:   { freq: 800, type: 'sine',     dur: 0.4  },
        invalid:   { freq: 220, type: 'square',   dur: 0.1  },
      };
      const c = configs[type] || configs.move;

      osc.type = c.type;
      osc.frequency.setValueAtTime(c.freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + c.dur);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + c.dur);
    } catch {}
  }
}

export const soundManager = new SoundManager();
