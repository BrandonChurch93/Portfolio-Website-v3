const sm = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

// A squeeze of oil paint from a tube, as a height over the board: a rope of paint laid in a coil, its first turn round
// the outside and the rest climbing onto it toward the middle, where the tube was pulled away and drew the paint up
// into a peak leaning off to one side. Where the rope lies on itself the two rounds meet in a crease, which is the
// highest of the two at each point and so comes out sharp.
export function coil(d: { r: number; h: number; lean: number; twist: number }): { at: (x: number, z: number) => number; reach: (a: number) => number } {
  const R = d.r, rope = R * 0.4, flat = 0.92, turns = 1.55, first = 1 / turns;
  const N = 72;
  const path: { x: number; z: number; y: number; w: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, th = d.twist + t * turns * Math.PI * 2;
    const rho = (R - rope) * (t <= first ? 1 - 0.08 * (t / first) : 0.92 - 0.72 * sm(first, 1, t));
    const w = rope * (0.6 + 0.4 * sm(0, 0.1, t)) * (1 - 0.12 * sm(first, 1, t));
    const y = rope * flat * (0.5 + 1.2 * sm(first * 0.78, first * 1.18, t) + 0.45 * sm(first * 1.2, 1, t));
    path.push({ x: rho * Math.cos(th), z: rho * Math.sin(th), y, w });
  }
  const end = path[N], ln = (d.lean * Math.PI) / 180;
  const tipX = end.x * 0.2 + Math.cos(ln) * R * 0.42, tipZ = end.z * 0.2 + Math.sin(ln) * R * 0.42;
  const at = (x: number, z: number) => {
    let h = 0;
    for (let i = 0; i < N; i++) {
      const p = path[i], q = path[i + 1];
      const ex = q.x - p.x, ez = q.z - p.z, ee = ex * ex + ez * ez || 1;
      const u = Math.max(0, Math.min(1, ((x - p.x) * ex + (z - p.z) * ez) / ee));
      const dx = x - p.x - ex * u, dz = z - p.z - ez * u, w = p.w + (q.w - p.w) * u;
      const dd = (dx * dx + dz * dz) / (w * w);
      if (dd < 1) h = Math.max(h, p.y + (q.y - p.y) * u + w * flat * Math.sqrt(1 - dd));
    }
    // The peak: the tail drawn up from the coil's end toward the tip, thinning as it rises.
    const ex = tipX - end.x, ez = tipZ - end.z, ee = ex * ex + ez * ez || 1;
    const u = Math.max(0, Math.min(1, ((x - end.x) * ex + (z - end.z) * ez) / ee));
    const dx = x - end.x - ex * u, dz = z - end.z - ez * u;
    const w = end.w * 1.25 * (1 - 0.82 * u) ** 0.9 + 0.2;
    const dd = (dx * dx + dz * dz) / (w * w);
    // It rises to the height of the squeeze and the last of it curls over and droops, so its end is a rounded hook
    // and not a cut.
    const base = end.y + end.w * flat * 0.8, rise = Math.sin((Math.min(1, u / 0.72) * Math.PI) / 2) ** 0.7;
    const top = base + (d.h - base - 0.3) * (rise - 0.38 * sm(0.72, 1, u));
    if (dd < 1) h = Math.max(h, top - w * (1 - Math.sqrt(1 - dd)) * 0.95);
    return h;
  };
  // How far out the paint reaches at each angle: where its height falls to nothing.
  const reachOf = new Float32Array(97);
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    let out = rope;
    for (let r = rope * 0.5; r < R * 1.15; r += 0.08) if (at(Math.cos(a) * r, Math.sin(a) * r) > 0.04) out = r;
    reachOf[i] = out + 0.04;
  }
  const reach = (a: number) => { const f = (((a / (Math.PI * 2)) % 1) + 1) % 1 * 96, i = Math.floor(f), k = f - i; return reachOf[i] * (1 - k) + reachOf[Math.min(96, i + 1)] * k; };
  return { at, reach };
}
