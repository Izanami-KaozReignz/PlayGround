// Tiny procedural soundscape. No external assets; everything is synthesized.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.started = false;
    this.musicT = 0;
    this.intensity = 0;
    this.drone = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);
    this._startDrone();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.08);
  }

  _startDrone() {
    const ctx = this.ctx;
    if (!ctx || this.drone) return;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.7;
    g.connect(filter);
    filter.connect(this.musicGain);
    const oscs = [];
    for (const [freq, det, type, vol] of [
      [55, 0, 'sine', 0.28],
      [82.5, 4, 'sine', 0.16],
      [110, -5, 'triangle', 0.07],
    ]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = vol;
      o.connect(og);
      og.connect(g);
      o.start();
      oscs.push(o);
    }
    // Slow breathing filter for an uneasy living-world ambience.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg);
    lg.connect(filter.frequency);
    lfo.start();
    this.drone = { g, oscs, lfo, filter };
  }

  _env(node, t0, a, d, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    return g;
  }

  _noise(dur) {
    const ctx = this.ctx;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const vol = opts.vol ?? 1;
    if (name === 'slash') {
      const src = this._noise(0.22);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(1400, t);
      f.frequency.exponentialRampToValueAtTime(420, t + 0.18);
      f.Q.value = 1.4;
      src.connect(f);
      this._env(f, t, 0.012, 0.2, 0.5 * vol).connect(this.master);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.14);
      this._env(o, t, 0.005, 0.13, 0.16 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.2);
      src.start(t);
      src.stop(t + 0.24);
    } else if (name === 'hit') {
      const src = this._noise(0.12);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      src.connect(f);
      this._env(f, t, 0.002, 0.1, 0.55 * vol).connect(this.master);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
      this._env(o, t, 0.003, 0.17, 0.55 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.22);
      src.start(t);
      src.stop(t + 0.14);
    } else if (name === 'dash') {
      const src = this._noise(0.3);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.24);
      src.connect(f);
      this._env(f, t, 0.03, 0.25, 0.16 * vol).connect(this.master);
      src.start(t);
      src.stop(t + 0.3);
    } else if (name === 'pull') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(680, t + 0.16);
      this._env(o, t, 0.005, 0.18, 0.2 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.22);
      const src = this._noise(0.2);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      src.connect(f);
      this._env(f, t, 0.01, 0.16, 0.14 * vol).connect(this.master);
      src.start(t);
      src.stop(t + 0.22);
    } else if (name === 'arrive') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
      this._env(o, t, 0.004, 0.2, 0.3 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.25);
      const src = this._noise(0.16);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      src.connect(f);
      this._env(f, t, 0.003, 0.14, 0.35 * vol).connect(this.master);
      src.start(t);
      src.stop(t + 0.18);
    } else if (name === 'hurt') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      o.connect(f);
      this._env(f, t, 0.005, 0.28, 0.32 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.36);
    } else if (name === 'shard') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const g = this._env(o, t + i * 0.09, 0.01, 1.1, 0.16 * vol);
        g.connect(this.musicGain);
        o.start(t + i * 0.09);
        o.stop(t + i * 0.09 + 1.2);
      });
      this.play('chime', { vol: 0.4 });
    } else if (name === 'chime' || name === 'heal') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = name === 'heal' ? 880 : 1320;
      this._env(o, t, 0.01, 0.5, 0.1 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 0.55);
    } else if (name === 'boss') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(34, t + 0.9);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(100, t + 0.9);
      o.connect(f);
      this._env(f, t, 0.05, 0.95, 0.45 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 1.05);
    } else if (name === 'gate') {
      [130.81, 196, 261.63, 392].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = freq;
        const g = this._env(o, t + i * 0.04, 0.06, 1.6, 0.14 * vol);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + 1.8);
      });
    } else if (name === 'death') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 1.4);
      this._env(o, t, 0.02, 1.5, 0.4 * vol).connect(this.master);
      o.start(t);
      o.stop(t + 1.6);
      this.play('hit', { vol: 1.4 });
    } else if (name === 'victory') {
      [261.63, 329.63, 392, 523.25, 659.25].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const g = this._env(o, t + i * 0.16, 0.08, 3.2, 0.13 * vol);
        g.connect(this.musicGain);
        o.start(t + i * 0.16);
        o.stop(t + i * 0.16 + 3.4);
      });
    } else if (name === 'tick') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 660;
      this._env(o, t, 0.002, 0.05, 0.04).connect(this.master);
      o.start(t);
      o.stop(t + 0.06);
    }
  }

  update(dt, intensity = 0) {
    if (!this.ctx) return;
    this.intensity += (intensity - this.intensity) * Math.min(1, dt * 0.8);
    if (this.drone) {
      this.drone.filter.frequency.value = 260 + this.intensity * 420;
      this.drone.g.gain.value = 0.0001 + 0.34 + this.intensity * 0.22;
    }
    this.musicT -= dt;
    if (this.musicT <= 0) {
      this.musicT = 6 + Math.random() * 7;
      if (!this.muted && Math.random() < 0.8) {
        const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
        const f = scale[Math.floor(Math.random() * scale.length)];
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * (Math.random() < 0.25 ? 0.5 : 1);
        const g = this._env(o, this.ctx.currentTime, 0.4, 3.4, 0.05 + this.intensity * 0.04);
        g.connect(this.musicGain);
        o.start();
        o.stop(this.ctx.currentTime + 4);
      }
    }
  }
}
