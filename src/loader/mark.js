// Loader mark — an original generative animation: a small node-graph
// assembles itself as loading progresses, then pulses gently.
// Echoes the BrainAI / agent-OS identity. Pure canvas 2D, no assets.

const NODES = [
  { x: 0.32, y: 0.30, r: 7, accent: true },
  { x: 0.70, y: 0.22, r: 5, accent: false },
  { x: 0.82, y: 0.55, r: 6, accent: false },
  { x: 0.62, y: 0.78, r: 7, accent: false },
  { x: 0.28, y: 0.70, r: 5, accent: true },
  { x: 0.50, y: 0.48, r: 8, accent: false },
];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [2, 5], [4, 5]];

export class LoaderMark {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.progress = 0;    // 0..1 real loading progress
    this.shown = 0;       // eased
    this.t = 0;
    this.running = true;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    const size = canvas.clientWidth || 200;
    canvas.width = size * this.dpr;
    canvas.height = size * this.dpr;
    this.size = size;
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  setProgress(p) { this.progress = Math.max(this.progress, Math.min(1, p)); }

  stop() { this.running = false; }

  tick(now) {
    if (!this.running) return;
    this.t = now / 1000;
    this.shown += (this.progress - this.shown) * 0.06;
    this.draw();
    requestAnimationFrame(this.tick);
  }

  draw() {
    const { ctx, size, dpr } = this;
    const s = size * dpr;
    ctx.clearRect(0, 0, s, s);

    const total = EDGES.length;
    const visEdges = this.shown * total;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.2);

    // edges draw on progressively
    ctx.lineWidth = 1.4 * dpr;
    EDGES.forEach(([ai, bi], i) => {
      const frac = Math.max(0, Math.min(1, visEdges - i));
      if (frac <= 0) return;
      const a = NODES[ai], b = NODES[bi];
      const x1 = a.x * s, y1 = a.y * s;
      const x2 = x1 + (b.x * s - x1) * frac;
      const y2 = y1 + (b.y * s - y1) * frac;
      ctx.strokeStyle = `rgba(250,250,250,${0.28 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // nodes appear as their first edge lands
    NODES.forEach((n, i) => {
      const appear = Math.max(0, Math.min(1, this.shown * (NODES.length + 2) - i));
      if (appear <= 0) return;
      const r = n.r * dpr * appear * (1 + (this.shown >= 1 ? pulse * 0.12 : 0));
      ctx.beginPath();
      ctx.arc(n.x * s, n.y * s, r, 0, Math.PI * 2);
      ctx.fillStyle = n.accent ? '#2f80ff' : 'rgba(250,250,250,0.92)';
      ctx.fill();
    });
  }
}
