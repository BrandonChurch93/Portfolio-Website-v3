import type { Art } from './stage';
import type { Paint, Relief } from './relief';

// The pieces of the accomplishments derby, each as a relief in bronze. Every figure but ten years is a stand in,
// and every company mark is a made up shape: the real ones are his to choose.

const SORA = '"Sora Variable", Sora, sans-serif';
const MONO = '"JetBrains Mono Variable", "JetBrains Mono", monospace';
const TAU = Math.PI * 2;

const circle = (x: number, y: number, r: number): Paint => (c) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const ring = (x: number, y: number, r: number, width: number): Paint => (c) => { c.lineWidth = width; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); };
const beads = (x: number, y: number, r: number, n: number, bead: number): Paint => (c) => {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, bead, 0, TAU); c.fill(); }
};
const rounded = (x: number, y: number, w: number, h: number, r: number): Paint => (c) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
const outline = (x: number, y: number, w: number, h: number, r: number, width: number): Paint => (c) => { c.lineWidth = width; c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); };
const shape = (pts: [number, number][]): Paint => (c) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const text = (s: string, x: number, y: number, font: string, align: CanvasTextAlign = 'left', track = 0): Paint => (c) => {
  c.font = font;
  c.textBaseline = 'alphabetic';
  if (!track) { c.textAlign = align; c.fillText(s, x, y); return; }
  const chars = [...s], widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let at = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  c.textAlign = 'left';
  chars.forEach((ch, i) => { c.fillText(ch, at, y); at += widths[i] + track; });
};
// Letters round the foot of a circle, reading left to right.
const arcText = (s: string, x: number, y: number, r: number, font: string, step: number): Paint => (c) => {
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const chars = [...s];
  chars.forEach((ch, i) => {
    const a = Math.PI / 2 + ((chars.length - 1) / 2 - i) * step;
    c.save();
    c.translate(x + Math.cos(a) * r, y + Math.sin(a) * r);
    c.rotate(a - Math.PI / 2);
    c.fillText(ch, 0, 0);
    c.restore();
  });
};
const petals = (x: number, y: number, n: number, from: number, to: number, width: number, turn = 0): Paint => (c) => {
  for (let i = 0; i < n; i++) {
    c.save();
    c.translate(x, y);
    c.rotate((i / n) * TAU + turn);
    c.beginPath();
    c.ellipse((from + to) / 2, 0, (to - from) / 2, width, 0, 0, TAU);
    c.fill();
    c.restore();
  }
};
const rays = (x: number, y: number, n: number, from: number, to: number, width: number): Paint => (c) => {
  c.lineWidth = width;
  c.lineCap = 'butt';
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * from, y + Math.sin(a) * from); c.lineTo(x + Math.cos(a) * to, y + Math.sin(a) * to); c.stroke(); }
};
// A pointed leaf lying along x, from its stalk at the origin.
const leaf = (c: CanvasRenderingContext2D, long: number, wide: number) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(long * 0.45, -wide, long, 0);
  c.quadraticCurveTo(long * 0.45, wide, 0, 0);
  c.fill();
};
// A wreath: two sprays that rise from the foot of a circle, each a stem with leaves in pairs, open at the top.
const wreath = (x: number, y: number, r: number, n: number, long: number, wide: number): Paint => (c) => {
  for (const side of [1, -1]) {
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y, r, Math.PI / 2 - side * 0.1, Math.PI / 2 - side * 2.86, side > 0);
    c.stroke();
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 - side * (0.16 + (i / (n - 1)) * 2.6);
      for (const out of [1, -1]) {
        c.save();
        c.translate(x + Math.cos(a) * r, y + Math.sin(a) * r);
        c.rotate(a - side * Math.PI / 2 + side * out * 0.62);
        leaf(c, long * (out > 0 ? 1 : 0.86), wide);
        c.restore();
      }
    }
  }
};
const within = (paint: Paint, move: (c: CanvasRenderingContext2D) => void): Paint => (c) => { move(c); paint(c); };

// A knob of the family he asked for on the blank: a beaded rim, a flower in relief, standing well off its plate.
function knob(r: Relief, x: number, y: number, size: number): void {
  const k = size / 30, seat = circle(x, y, 35 * k), dome = circle(x, y, 26.5 * k), eye = circle(x, y, 5.4 * k);
  r.raise(seat, 2, 3 * k)
    .finish(seat, 0.25)
    .raise(beads(x, y, 30.6 * k, 32, 2 * k), 2.2 * k, 2 * k)
    .raise(dome, 15 * k, 26.5 * k)
    .finish(dome, 0)
    .raise(petals(x, y, 8, 6.5 * k, 20 * k, 4.8 * k), 2.2 * k, 3.4 * k)
    .raise(petals(x, y, 8, 12 * k, 22.5 * k, 2 * k, Math.PI / 8), 1.2 * k, 1.6 * k)
    .raise(eye, 3.2 * k, 5.4 * k)
    .tone(ring(x, y, 24.6 * k, 1.8 * k), 0.5);
}

// A ring that hangs from a small boss, as on the drawer of a map chest.
function pull(r: Relief, x: number, y: number, size: number): void {
  const k = size / 30, plate = circle(x, y, 15 * k);
  r.raise(plate, 1.6, 2.5 * k)
    .finish(plate, 0.3)
    .raise(beads(x, y, 11.5 * k, 16, 1.5 * k), 1.4 * k, 1.5 * k)
    .raise(circle(x, y, 7.5 * k), 6 * k, 7.5 * k)
    .raise(ring(x, y + 21 * k, 21 * k, 6.4 * k), 5.4 * k, 3.2 * k)
    .raise(circle(x, y + 42 * k, 4.4 * k), 2 * k, 4.4 * k);
}

// Three pictures in relief for the end of a plate. Each stands in for a picture of the thing itself.
function emblem(r: Relief, i: number, x: number, y: number): void {
  const seat = circle(x, y, 36);
  r.raise(seat, 1.8, 3).finish(seat, 0.3).raise(beads(x, y, 31.5, 30, 1.9), 1.8, 1.9);
  if (i === 0) {
    const dome = circle(x, y, 26);
    r.raise(dome, 8, 26).finish(dome, 0).raise(rays(x, y, 12, 9, 22, 2.6), 1.6, 1.4).raise(circle(x, y, 6.5), 2.4, 6.5);
  } else if (i === 1) {
    const cut = shape([0, 1, 2, 3, 4, 5, 6, 7].map((n): [number, number] => [x + Math.cos((n + 0.5) * TAU / 8) * 25, y + Math.sin((n + 0.5) * TAU / 8) * 25]));
    const well = circle(x, y, 28);
    r.sink(well, 1.2, 3).finish(well, 0.62).tone(well, 0.4, 3).raise(cut, 9, 9.5, 'flat').finish(cut, 0, 0.6);
  } else {
    const base = circle(x, y, 26);
    r.raise(base, 2.4, 2.4).finish(base, 0).raise(circle(x, y, 19.5), 2.4, 2.4).raise(circle(x, y, 13), 2.4, 2.4).raise(circle(x, y, 6.5), 3.4, 6.5);
  }
}

export type MedalKind = 'struck' | 'wreathed' | 'blank';

// A medal. Struck, it carries a figure and what the figure counts. Unstruck, it is a blank with turned rays.
export function medal(figure: string, label: string, kind: MedalKind = 'struck'): Art {
  return {
    w: 220, h: 220,
    draw(r) {
      const field = circle(110, 110, 90);
      r.body(circle(110, 110, 108), 7, 4.6).sink(field, 2, 3.5).finish(field, 0.7).tone(field, 0.6, 5);
      if (kind === 'wreathed') {
        const leaves = wreath(110, 110, 76, 15, 13, 3.3);
        r.raise(ring(110, 110, 99, 3), 1.8, 1.5).raise(leaves, 1.9, 2.2).finish(leaves, 0.05, 1);
      } else r.raise(beads(110, 110, 98.5, 46, 3.3), 3.2, 3.3).raise(ring(110, 110, 87, 2), 1.4, 1);
      if (kind === 'blank') {
        const boss = circle(110, 110, 10), spokes = rays(110, 110, 90, 13, 83, 0.9);
        r.sink(spokes, 0.8, 0.6).tone(spokes, 0.85, 0.6).raise(boss, 3.6, 10).finish(boss, 0).raise(ring(110, 110, 14, 1.6), 1, 0.8);
        return;
      }
      const size = kind === 'wreathed' ? 56 : figure.length > 2 ? 62 : 76, base = 110 + size * (kind === 'wreathed' ? 0.2 : 0.27);
      const number = text(figure, 110, base, `700 ${size}px ${SORA}`, 'center');
      r.raise(number, 5.2, 6).finish(number, 0, 2.4);
      if (kind === 'wreathed') {
        const band = rounded(66, 133, 88, 22, 4), words = text(label, 110, 149, `700 12px ${MONO}`, 'center', 1.6);
        r.raise(band, 1.8, 1.6).finish(band, 0.1).sink(words, 1, 0.7).tone(words, 0.95, 0.7);
      } else {
        const words = arcText(label, 110, 110, 68, `700 15px ${MONO}`, 0.215);
        r.raise(words, 1.6, 1.1).finish(words, 0.05, 1).raise(beads(110, 110, 69, 2, 2.4), 1.6, 2.4);
      }
    },
  };
}

export const PLATE = { w: 720, h: 104, drop: 80 };

// A long plate that runs downhill, with everything on it leaning the same way. dir 1 runs down to the right.
// emblem picks a picture for its end, or none.
export function plate(figure: string, label: string, dir: 1 | -1, emblem_ = -1): Art {
  const { w: W, h: H, drop } = PLATE, k = (dir * drop) / W, lift = dir > 0 ? 0 : drop;
  const lean = (p: Paint) => within(p, (c) => c.transform(1, k, 0, 1, 0, lift));
  const at = (x: number, y: number): [number, number] => [x, y + k * x + lift];
  return {
    w: W, h: H + drop,
    draw(r) {
      const face = lean(rounded(11, 11, W - 22, H - 22, 7)), number = lean(text(figure, 40, H / 2 + 24, `700 68px ${SORA}`));
      const words = lean(text(label, 200, H / 2 - 6, `700 17px ${MONO}`, 'left', 2.6)), rule = lean((c) => { c.fillRect(172, 26, 2, H - 52); });
      const one = lean(rounded(200, H / 2 + 9, 250, 5.5, 2.75)), two = lean(rounded(200, H / 2 + 24, 176, 5.5, 2.75));
      r.body(lean(rounded(1, 1, W - 2, H - 2, 11)), 6, 4.2)
        .sink(face, 1.8, 2.6).finish(face, 0.7).tone(face, 0.6, 4)
        .raise(number, 5.2, 6).finish(number, 0, 2.4)
        .sink(rule, 1, 0.9).tone(rule, 0.7, 0.9)
        .sink(words, 1.2, 0.9).tone(words, 1, 0.9)
        .sink(one, 0.9, 1.2).tone(one, 0.8, 1.2)
        .sink(two, 0.9, 1.2).tone(two, 0.8, 1.2);
      if (emblem_ >= 0) emblem(r, emblem_, ...at(W - 68, H / 2));
    },
  };
}

export const DRAWER = { w: 460, h: 118 };
export type DrawerKind = 'knob' | 'ring';

// The front of a drawer. With a knob, its label sits in a holder. With a ring, the figure is cut into the panel.
export function drawer(figure: string, label: string, kind: DrawerKind = 'knob'): Art {
  const { w: W, h: H } = DRAWER;
  return {
    w: W, h: H,
    draw(r) {
      const well = rounded(11, 11, W - 22, H - 22, 6), panel = rounded(21, 21, W - 42, H - 42, 4);
      r.body(rounded(1, 1, W - 2, H - 2, 10), 6, 4)
        .sink(well, 2.4, 3).finish(well, 0.7).tone(well, 0.8, 4)
        .raise(panel, 2.2, 6, 'soft').finish(panel, 0.6, 3).tone(panel, 0.4, 5);
      if (kind === 'knob') {
        const hold = outline(36, 35, 214, 48, 5, 5.5), slip = rounded(39, 38, 208, 42, 3), number = text(figure, 54, 69.5, `700 30px ${SORA}`);
        const words = text(label, 54 + figure.length * 21.5 + 12, 66, `700 14px ${MONO}`, 'left', 2);
        r.raise(hold, 2.6, 2.2).finish(hold, 0).sink(slip, 0.8, 1.5).finish(slip, 0.5).tone(slip, 0.12, 1)
          .sink(number, 1.1, 0.9).tone(number, 1, 0.9).sink(words, 1, 0.8).tone(words, 1, 0.8);
        knob(r, 372, H / 2, 27);
      } else {
        const number = text(figure, 40, H / 2 + 22, `700 62px ${SORA}`), words = text(label, 152, H / 2 + 6, `700 15px ${MONO}`, 'left', 2.4);
        r.sink(number, 1.7, 1.6).finish(number, 0.75, 1).tone(number, 0.8, 1).sink(words, 1.1, 0.9).tone(words, 1, 0.9);
        pull(r, 380, H / 2 - 21, 29);
      }
    },
  };
}

// Six made up marks. None is any company's.
function mark(i: number, x: number, y: number, size: number): Paint {
  const k = size / 2;
  return (c) => {
    c.lineWidth = size * 0.17;
    c.lineCap = 'butt';
    c.beginPath();
    switch (i % 6) {
      case 0: c.arc(x, y, k * 0.78, 0, TAU); c.stroke(); break;
      case 1: c.moveTo(x, y - k * 0.9); c.lineTo(x + k * 0.9, y + k * 0.72); c.lineTo(x - k * 0.9, y + k * 0.72); c.closePath(); c.fill(); break;
      case 2: for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU + Math.PI / 6; if (j) c.lineTo(x + Math.cos(a) * k * 0.9, y + Math.sin(a) * k * 0.9); else c.moveTo(x + Math.cos(a) * k * 0.9, y + Math.sin(a) * k * 0.9); } c.closePath(); c.stroke(); break;
      case 3: for (let j = -1; j <= 1; j++) { c.moveTo(x - k * 0.85, y + j * k * 0.5); c.lineTo(x + k * 0.85, y + j * k * 0.5); } c.stroke(); break;
      case 4: c.moveTo(x, y - k * 0.92); c.lineTo(x + k * 0.92, y); c.lineTo(x, y + k * 0.92); c.lineTo(x - k * 0.92, y); c.closePath(); c.fill(); break;
      default: c.arc(x - k * 0.34, y, k * 0.56, 0, TAU); c.moveTo(x + k * 0.9, y); c.arc(x + k * 0.34, y, k * 0.56, 0, TAU); c.stroke();
    }
  };
}

export const BAR = { cell: 180, h: 84 };

// The marks struck into one bar, side by side. from is the first mark it shows.
export function stampedBar(n: number, from = 0): Art {
  const W = BAR.cell * n, H = BAR.h;
  return {
    w: W, h: H,
    draw(r) {
      const face = rounded(8, 8, W - 16, H - 16, 6), cut = outline(9, 9, W - 18, H - 18, 5, 1.6);
      r.body(rounded(1, 1, W - 2, H - 2, 10), 5, 3.4).finish(face, 0.42).tone(face, 0.16, 3).sink(cut, 0.9, 0.8).tone(cut, 0.85, 0.8);
      for (let i = 0; i < n; i++) {
        const m = mark(i + from, BAR.cell * (i + 0.5), H / 2, 36);
        r.sink(m, 1.6, 1.2).finish(m, 0.8, 1).tone(m, 0.9, 1);
        if (i) { const rule: Paint = (c) => { c.fillRect(i * BAR.cell - 0.8, 20, 1.6, H - 40); }; r.sink(rule, 0.9, 0.9).tone(rule, 0.7, 0.9); }
      }
    },
  };
}

// One mark raised on a token of its own.
export function token(i: number): Art {
  return {
    w: 100, h: 100,
    draw(r) {
      const field = circle(50, 50, 38), m = mark(i, 50, 50, 38);
      r.body(circle(50, 50, 48), 5, 3.6)
        .sink(field, 1.6, 2.5).finish(field, 0.7).tone(field, 0.6, 3)
        .raise(beads(50, 50, 43, 30, 1.7), 1.5, 1.7)
        .raise(m, 2.6, 2).finish(m, 0, 1.5);
    },
  };
}

export const HALLMARK = { cell: 58, pad: 35, h: 62 };

// The marks as hallmarks: each small, raised inside a sunk shape of its own, close together on a narrow band.
export function hallmarks(n: number): Art {
  const { cell, pad, h: H } = HALLMARK, W = pad * 2 + cell * n;
  const well = (i: number, x: number): Paint => (c) => {
    c.beginPath();
    if (i % 3 === 0) c.ellipse(x, H / 2, 19, 22, 0, 0, TAU);
    else if (i % 3 === 1) { c.moveTo(x - 18, H / 2 - 20); c.lineTo(x + 18, H / 2 - 20); c.lineTo(x + 18, H / 2 + 6); c.lineTo(x, H / 2 + 22); c.lineTo(x - 18, H / 2 + 6); c.closePath(); }
    else c.roundRect(x - 19, H / 2 - 20, 38, 40, 9);
    c.fill();
  };
  return {
    w: W, h: H,
    draw(r) {
      r.body(rounded(1, 1, W - 2, H - 2, 9), 4, 2.8).finish(rounded(6, 6, W - 12, H - 12, 6), 0.45);
      for (let i = 0; i < n; i++) {
        const x = pad + cell * (i + 0.5), pit = well(i, x), m = mark(i, x, H / 2, 22);
        r.sink(pit, 1.8, 1.4).finish(pit, 0.7).tone(pit, 0.6, 2).raise(m, 1.5, 1.1).finish(m, 0, 1);
      }
    },
  };
}

// One mark struck into a small plate, to stand beside a company's name and a line about it.
export function stamp(i: number): Art {
  return {
    w: 72, h: 72,
    draw(r) {
      const m = mark(i, 36, 36, 34);
      r.body(rounded(1, 1, 70, 70, 12), 5, 3.2).finish(rounded(8, 8, 56, 56, 7), 0.5).sink(m, 1.6, 1.2).finish(m, 0.8, 1).tone(m, 0.9, 1);
    },
  };
}
