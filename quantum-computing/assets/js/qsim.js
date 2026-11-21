/* qsim.js: a tiny state-vector simulator, the JavaScript twin of the
   70-line NumPy simulator in Chapter 24. Convention (same as the guide and
   most textbooks): qubit 0 is the LEFTMOST character of a bit string. */
(function () {
  'use strict';
  const C = (re, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const scale = (a, s) => C(a.re * s, a.im * s);
  const abs2 = (a) => a.re * a.re + a.im * a.im;
  const expi = (t) => C(Math.cos(t), Math.sin(t));
  const s2 = Math.SQRT1_2;

  const G = {
    I: [[C(1), C(0)], [C(0), C(1)]],
    X: [[C(0), C(1)], [C(1), C(0)]],
    Y: [[C(0), C(0, -1)], [C(0, 1), C(0)]],
    Z: [[C(1), C(0)], [C(0), C(-1)]],
    H: [[C(s2), C(s2)], [C(s2), C(-s2)]],
    S: [[C(1), C(0)], [C(0), C(0, 1)]],
    T: [[C(1), C(0)], [C(0), expi(Math.PI / 4)]],
    Sdg: [[C(1), C(0)], [C(0), C(0, -1)]],
  };
  G.RY = (t) => [[C(Math.cos(t / 2)), C(-Math.sin(t / 2))], [C(Math.sin(t / 2)), C(Math.cos(t / 2))]];
  G.RX = (t) => [[C(Math.cos(t / 2)), C(0, -Math.sin(t / 2))], [C(0, -Math.sin(t / 2)), C(Math.cos(t / 2))]];
  G.RZ = (t) => [[expi(-t / 2), C(0)], [C(0), expi(t / 2)]];

  class State {
    constructor(n) {
      this.n = n;
      this.a = Array.from({ length: 1 << n }, (_, i) => C(i === 0 ? 1 : 0));
    }
    static from(amps) {
      const n = Math.round(Math.log2(amps.length));
      const s = new State(n);
      s.a = amps.map((x) => (typeof x === 'number' ? C(x) : C(x.re, x.im)));
      return s;
    }
    clone() { const s = new State(this.n); s.a = this.a.map((x) => C(x.re, x.im)); return s; }
    bit(i, q) { return (i >> (this.n - 1 - q)) & 1; }
    gate(U, q) {
      const m = 1 << (this.n - 1 - q);
      for (let i = 0; i < this.a.length; i++) {
        if (i & m) continue;
        const j = i | m, x = this.a[i], y = this.a[j];
        this.a[i] = add(mul(U[0][0], x), mul(U[0][1], y));
        this.a[j] = add(mul(U[1][0], x), mul(U[1][1], y));
      }
      return this;
    }
    controlled(U, c, t) {
      const mc = 1 << (this.n - 1 - c), mt = 1 << (this.n - 1 - t);
      for (let i = 0; i < this.a.length; i++) {
        if (!(i & mc) || (i & mt)) continue;
        const j = i | mt, x = this.a[i], y = this.a[j];
        this.a[i] = add(mul(U[0][0], x), mul(U[0][1], y));
        this.a[j] = add(mul(U[1][0], x), mul(U[1][1], y));
      }
      return this;
    }
    cnot(c, t) { return this.controlled(G.X, c, t); }
    cz(c, t) { return this.controlled(G.Z, c, t); }
    probs() { return this.a.map(abs2); }
    label(i) { return i.toString(2).padStart(this.n, '0'); }
    sample(shots, rng = Math.random) {
      const p = this.probs(), cum = [];
      let acc = 0;
      for (const x of p) { acc += x; cum.push(acc); }
      const counts = new Array(p.length).fill(0);
      for (let s = 0; s < shots; s++) {
        const r = rng() * acc;
        let lo = 0, hi = cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
        counts[lo]++;
      }
      return counts;
    }
    /* measure qubit q, collapse, return the outcome */
    measure(q, rng = Math.random) {
      let p1 = 0;
      this.a.forEach((x, i) => { if (this.bit(i, q)) p1 += abs2(x); });
      const out = rng() < p1 ? 1 : 0, norm = Math.sqrt(out ? p1 : 1 - p1) || 1;
      this.a = this.a.map((x, i) => (this.bit(i, q) === out ? scale(x, 1 / norm) : C(0)));
      return out;
    }
  }

  function fmtC(z, d = 3) {
    const r = (v) => {
      const s = (Math.abs(v) < 5e-4 ? 0 : v).toFixed(d).replace(/\.?0+$/, '');
      return s === '-0' ? '0' : s;
    };
    const re = r(z.re), im = r(Math.abs(z.im));
    if (Math.abs(z.im) < 5e-4) return re;
    if (Math.abs(z.re) < 5e-4) return (z.im < 0 ? '−' : '') + (im === '1' ? '' : im) + 'i';
    return `${re} ${z.im < 0 ? '−' : '+'} ${im === '1' ? '' : im}i`;
  }

  window.QSim = { C, add, mul, scale, abs2, expi, G, State, fmtC };
})();
