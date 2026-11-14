// Input: keyboard, mouse, and multi-touch (virtual stick + action buttons).
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.queue = new Map();
    this.mouse = { x: 0, y: 0, down: false, right: false, inside: false };
    this.touchMode = false;
    this.stick = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
    this.buttons = [];
    this.held = new Set();
    this.heldOwners = new Map();
    this.pointers = new Map();
    this.anyGesture = false;
    this.onGesture = null;

    this._bindKeyboard();
    this._bindPointer();
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.compact = Math.min(w, h) < 620;
    const m = this.compact ? 22 : 34;
    const s = this.compact ? 0.9 : 1;
    // Right-hand action cluster, kept inside phone safe areas.
    this.buttons = [
      { id: 'attack', label: 'STRIKE', glyph: '⚔', x: w - m - 56 * s, y: h - m - 58 * s, r: 46 * s, primary: true },
      { id: 'pull', label: 'TETHER', glyph: '✦', x: w - m - 156 * s, y: h - m - 40 * s, r: 34 * s },
      { id: 'dash', label: 'DASH', glyph: '»', x: w - m - 52 * s, y: h - m - 166 * s, r: 32 * s },
    ];
    this.pauseBtn = { x: w - m - 12, y: m + 12, r: 20 };
    this.stick.base = { x: m + 66 * s, y: h - m - 74 * s, r: 58 * s };
    if (this.stick.active) {
      this.stick.ox = this.stick.base.x;
      this.stick.oy = this.stick.base.y;
    }
  }

  _emit(action) {
    this.queue.set(action, (this.queue.get(action) || 0) + 1);
    this.anyGesture = true;
    this.onGesture?.();
  }

  take(action) {
    const n = this.queue.get(action) || 0;
    if (n > 0) {
      this.queue.delete(action);
      return true;
    }
    return false;
  }

  clear() {
    this.queue.clear();
  }

  _bindKeyboard() {
    const blocked = new Set([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'tab']);
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (blocked.has(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === ' ' || k === 'shift') this._emit('dash');
      else if (k === 'j' || k === 'f') this._emit('attack');
      else if (k === 'e' || k === 'q') this._emit('pull');
      else if (k === 'escape' || k === 'p') this._emit('pause');
      else if (k === 'enter' || k === 'r') this._emit('confirm');
      this.anyGesture = true;
      this.onGesture?.();
    }, { passive: false });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
      this.mouse.right = false;
      this.held.clear();
    });
  }

  _bindPointer() {
    const c = this.canvas;
    const setMouse = (e) => {
      const r = c.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.inside = true;
    };

    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointerdown', (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      this.pointers.set(e.pointerId, { x, y, type: e.pointerType });
      this.anyGesture = true;
      this.onGesture?.();

      if (e.pointerType === 'mouse') {
        setMouse(e);
        if (e.button === 0) {
          this.mouse.down = true;
          this._emit('attack');
        } else if (e.button === 2) {
          this.mouse.right = true;
          this._emit('pull');
        }
        return;
      }

      this.touchMode = true;
      e.preventDefault();

      // Pause button.
      if (Math.hypot(x - this.pauseBtn.x, y - this.pauseBtn.y) < this.pauseBtn.r * 1.8) {
        this._emit('pause');
        return;
      }

      // Action buttons.
      for (const b of this.buttons) {
        if (Math.hypot(x - b.x, y - b.y) < b.r * 1.32) {
          this.held.add(b.id);
          this.heldOwners.set(e.pointerId, b.id);
          this._emit(b.id);
          return;
        }
      }

      // Virtual stick anywhere on the left portion of the screen.
      if (x < this.w * 0.55 && !this.stick.active) {
        this.stick.id = e.pointerId;
        this.stick.active = true;
        this.stick.ox = x;
        this.stick.oy = y;
        this.stick.x = x;
        this.stick.y = y;
        this.stick.dx = 0;
        this.stick.dy = 0;
      }
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (e.pointerType === 'mouse') {
        setMouse(e);
        return;
      }
      if (this.pointers.has(e.pointerId)) {
        this.pointers.set(e.pointerId, { x, y, type: e.pointerType });
      }
      if (this.stick.active && this.stick.id === e.pointerId) {
        this.stick.x = x;
        this.stick.y = y;
        const dx = x - this.stick.ox;
        const dy = y - this.stick.oy;
        const len = Math.hypot(dx, dy);
        const max = this.stick.base.r;
        if (len > max) {
          this.stick.ox += dx * (1 - max / len);
          this.stick.oy += dy * (1 - max / len);
        }
        const nx = (x - this.stick.ox) / max;
        const ny = (y - this.stick.oy) / max;
        const nl = Math.hypot(nx, ny);
        this.stick.dx = nl > 1 ? nx / nl : nx;
        this.stick.dy = nl > 1 ? ny / nl : ny;
      }
    }, { passive: false });

    const end = (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) this.mouse.down = false;
        if (e.button === 2) this.mouse.right = false;
      }
      this.pointers.delete(e.pointerId);
      if (this.stick.active && this.stick.id === e.pointerId) {
        this.stick.active = false;
        this.stick.id = null;
        this.stick.dx = 0;
        this.stick.dy = 0;
      }
      // Release held buttons belonging to this pointer.
      const owned = this.heldOwners.get(e.pointerId);
      if (owned) {
        this.held.delete(owned);
        this.heldOwners.delete(e.pointerId);
      }
      if (e.pointerType !== 'mouse' && this.pointers.size === 0) this.held.clear();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.mouse.inside = false;
    });

    // Fallback for browsers that fire touch events but no pointer events.
    c.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  get move() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.stick.active) {
      x += this.stick.dx;
      y += this.stick.dy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, len: Math.min(1, len) };
  }

  get attackHeld() {
    return this.mouse.down || this.held.has('attack');
  }
}
