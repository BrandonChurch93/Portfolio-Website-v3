// A quick look at sculpt B without making it: the field traced along every view ray of the page's host, lit
// roughly by the core and the moon with their shadows, and written as a still of the whole world at the page's size
// (one pixel a unit), which npm run match lays over picture 9 with --still. For lining the trace up only: the
// light is not the baked light.
//
//   node scripts/world/parts/rock-b/preview.mjs [--out shots/world/rock-b/preview.png] [--step 1]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import process from 'node:process';

if (isMainThread) {
  const { L } = await import('../../lib/plan.mjs');
  const { png } = await import('../../lib/png.mjs');
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', 'shots/world/rock-b/preview.png'), step = Number(arg('--step', 1));
  const W = L.HOST.wide, H = L.HOST.tall, img = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) img.set([7, 4, 3], i * 3);
  const rows = [];
  for (let y = 250; y < 930; y += step) rows.push(y);
  const t0 = performance.now();
  let next = 0;
  await Promise.all(Array.from({ length: availableParallelism() }, () => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { W, step } });
    const give = () => { if (next < rows.length) w.postMessage(rows[next++]); else { w.terminate(); resolve(); } };
    w.on('message', (m) => {
      if (m.ready) return give();
      for (let s = 0; s < step; s++) if (m.y + s < H) for (let x = 0; x < W; x++) img.set(m.rgb.subarray(x * 3, x * 3 + 3), ((m.y + s) * W + x) * 3);
      give();
    });
    w.on('error', reject);
  })));
  png(out, W, H, img, 3);
  console.log(`preview: ${out} in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
} else {
  const { L } = await import('../../lib/plan.mjs');
  const F = await import('./field.mjs');
  await F.setup();
  const { W, step } = workerData, TIP = L.drawn(0, L.SPIRE.tall, 0)[1], u = L.PICTURE.unit;
  const core = L.CORE.at, moon = (() => { const m = Math.hypot(...L.MOONWARD); return L.MOONWARD.map((v) => v / m); })();
  const march = (o, d, far) => {
    let t = 0;
    for (let i = 0; i < 400 && t < far; i++) {
      const f = F.field(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t);
      if (f < 0.05) return t;
      t += Math.max(0.4, f / F.lip);
    }
    return -1;
  };
  const normal = (p) => {
    const e = 0.4, g = [0, 1, 2].map((a) => { const q = [...p], r = [...p]; q[a] += e; r[a] -= e; return F.field(...q) - F.field(...r); });
    const l = Math.hypot(...g) || 1;
    return g.map((v) => v / l);
  };
  parentPort.on('message', (y) => {
    const rgb = new Uint8Array(W * 3);
    const py = L.PICTURE.tip + (y - TIP) / u;
    for (let x = 0; x < W; x += step) {
      const px = L.PICTURE.mid + (x - W / 2) / u;
      const a = L.fromPicture(px, py, 760), b = L.fromPicture(px, py, -760), len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len];
      let c = [7, 4, 3];
      const t = march(a, d, len);
      if (t >= 0) {
        const p = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t], n = normal(p), q = [p[0] + n[0] * 1.5, p[1] + n[1] * 1.5, p[2] + n[2] * 1.5];
        const tc = [core[0] - q[0], core[1] - q[1], core[2] - q[2]], dc = Math.hypot(...tc), lc = tc.map((v) => v / dc);
        let ec = Math.max(0, n[0] * lc[0] + n[1] * lc[1] + n[2] * lc[2]) * Math.pow(L.CORE.r / Math.max(L.CORE.r, dc), 1.6);
        if (ec > 0 && march(q, lc, dc - L.CORE.r - 2) >= 0) ec = 0;
        let em = Math.max(0, n[0] * moon[0] + n[1] * moon[1] + n[2] * moon[2]);
        if (em > 0 && march(q, moon, 1500) >= 0) em = 0;
        const sky = 0.05 + 0.05 * Math.max(0, n[2]);
        const r = 255 * Math.min(1, ec * 2.4 + em * 0.55 + sky), g = 255 * Math.min(1, ec * 1.7 + em * 0.5 + sky * 0.8), bl = 255 * Math.min(1, ec * 1.0 + em * 0.45 + sky * 0.7);
        c = [r, g, bl].map((v) => Math.round(255 * Math.pow(v / 255, 1 / 2.2)));
      }
      for (let s = 0; s < step && x + s < W; s++) rgb.set(c, (x + s) * 3);
    }
    parentPort.postMessage({ y, rgb }, [rgb.buffer]);
  });
  parentPort.postMessage({ ready: true });
}
