import { hex, type PaletteName } from '../../config/palette';
import { HOST, LAND, drawn, noise, ramp, seeded } from './layout';

// The city going on behind the one that is built, as picture 10 has it (?look=d): a low warm haze over the land's
// far edge and, in it, far towers as plain shapes at three depths, fainter the further, a few of their rooms lit.
// It is one picture, drawn once into a plain 2D canvas under the world's canvas: it shows only where the world is
// clear, it costs nothing a frame, and nothing of the world is changed by it. It never moves.
// It is the one thing of picture 10 that stands in the sky, which he asked to be left as it is, so it is his to
// refuse: `on: false` takes it out.
export const FAR = {
  on: true,
  // How many of its pixels a unit is: on a desktop, and on an iPad or a phone.
  dense: [2, 1],
  // The haze: where its middle is across the host, in units, and how far from there it is whole and gone.
  at: 690,
  wide: [240, 600],
  // Its color: the palette's ember with this much of its deep bronze in it, so it is dust lit warm and not a flame.
  dust: 0.45,
  // How bright it is at the land's far edge, as a share of that color, how many units up it falls to about a third,
  // how far up it is gone, and how far under the edge it goes on, behind the land.
  most: 1.25,
  falls: 85,
  tall: 230,
  under: 8,
  // How much of it is missing in its thinnest banks, and how many units across a bank is.
  banks: [0.14, 300],
  // The far towers, furthest first: how wide and how tall over the far edge they are, in units, how much of what is
  // behind one it hides, how much of the haze is in front of it, and how bright its lit rooms are (0: it has none).
  towers: [
    { wide: [9, 16], tall: [22, 58], hides: 0.6, front: 0.84, rooms: 0 },
    { wide: [11, 20], tall: [22, 70], hides: 0.7, front: 0.74, rooms: 0.3 },
    { wide: [13, 24], tall: [20, 84], hides: 0.8, front: 0.62, rooms: 0.5 },
  ],
  // Where across the host they begin and where they end, each over a fade, in units.
  ends: [[110, 260], [980, 1150]],
  // The share of their rooms that are lit, and how far apart rooms are across and up, in units.
  lit: 0.05,
  room: [4, 5],
} as const;

export interface Far {
  dispose(): void;
}

const rgb = (name: PaletteName): [number, number, number] => { const n = hex(name); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export function far(canvas: HTMLCanvasElement, handheld: boolean): Far | null {
  if (!FAR.on) return null;
  const dense = FAR.dense[handheld ? 1 : 0], mid = HOST.wide / 2, wide = HOST.wide * dense;
  // The land's far edge as the host shows it: how far down the host it is, at each place across.
  const edge: [number, number][] = [];
  for (let i = 0; i <= 400; i++) {
    const x = LAND.rim * (i / 200 - 1), [dx, dy] = drawn(x, 0, -Math.sqrt(Math.max(0, LAND.rim * LAND.rim - x * x)));
    edge.push([mid + dx, dy]);
  }
  const at = (x: number): number => {
    let i = 1;
    while (i < edge.length - 1 && edge[i][0] < x) i++;
    const [x0, y0] = edge[i - 1], [x1, y1] = edge[i], u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    return y0 + (y1 - y0) * u;
  };
  const top = Math.floor(Math.min(...edge.map((p) => p[1])) - FAR.tall), foot = Math.ceil(Math.max(...edge.map((p) => p[1]))) + FAR.under;
  const tall = (foot - top) * dense;

  const line = new Float32Array(wide), lit = new Float32Array(wide), shown = new Float32Array(wide);
  for (let c = 0; c < wide; c++) {
    const x = (c + 0.5) / dense;
    line[c] = at(x);
    lit[c] = FAR.most * (1 - ramp(FAR.wide[0], FAR.wide[1], Math.abs(x - FAR.at))) * (1 - FAR.banks[0] * noise(x / FAR.banks[1], 0.5, 0.5, 5));
    shown[c] = ramp(FAR.ends[0][0], FAR.ends[0][1], x) * (1 - ramp(FAR.ends[1][0], FAR.ends[1][1], x));
  }

  // Each depth of towers: over each column, how tall the tower there stands over its own foot, how far down the
  // host that foot is, and which pixels are lit rooms.
  const depths = FAR.towers.map((kind, k) => {
    const R = seeded(71 + k * 13), between = (r: readonly [number, number], bent = 1) => r[0] + (r[1] - r[0]) * R() ** bent;
    const tops = new Float32Array(wide), feet = new Float32Array(wide), rooms = kind.rooms > 0 ? new Uint8Array(wide * tall) : null;
    for (let x = FAR.ends[0][0] - R() * 12; x < FAR.ends[1][1];) {
      const w = Math.round(between(kind.wide)), middle = x + w / 2, base = at(middle);
      const h = between(kind.tall, 2.2) * (0.78 + 0.22 * (1 - ramp(120, 520, Math.abs(middle - FAR.at)))), crown = R(), more = between([6, 18]), inset = between([0.2, 0.32]);
      for (let c = Math.max(0, Math.round(x * dense)); c < Math.min(wide, Math.round((x + w) * dense)); c++) {
        const off = Math.abs((c + 0.5) / dense - middle) / (w / 2);
        let up = h;
        if (crown < 0.24) up += off < 1 - 2 * inset ? more : off < 1 - inset ? more / 2 : 0;
        else if (crown < 0.44) up += off < 1 - 2 * inset ? more * 0.7 : 0;
        else if (crown < 0.6) up += more * Math.max(0, 1 - off / (1 - inset));
        else if (crown < 0.72) up += off < 1 / w ? more : 0;
        if (up > tops[c]) { tops[c] = up; feet[c] = base; }
      }
      if (rooms) {
        const [across, rise] = FAR.room;
        for (let i = 0; i < Math.floor((w - 2) / across); i++) {
          for (let j = 0; j < Math.floor((h - 6) / rise); j++) {
            if (R() >= FAR.lit) continue;
            const left = Math.round((x + 1.5 + i * across) * dense), high = base - (4 + j * rise) - top;
            for (let c = Math.max(0, left); c < Math.min(wide, left + dense); c++) for (let r = Math.round((high - 1.5) * dense); r < Math.round(high * dense); r++) if (r >= 0 && r < tall) rooms[r * wide + c] = 1;
          }
        }
      }
      x += w + (R() < 0.5 ? R() * 10 : -R() * 3);
    }
    return { kind, tops, feet, rooms };
  });

  const under = document.createElement('canvas');
  under.setAttribute('aria-hidden', 'true');
  // It is placed by the host's width alone, as the world's own view is: a margin's share is of the width.
  under.style.cssText = `position:absolute;left:0;top:0;margin-top:${(100 * top) / HOST.wide}%;width:100%;height:auto;display:block;z-index:-1;pointer-events:none`;
  under.width = wide;
  under.height = tall;
  const pen = under.getContext('2d');
  if (!pen) return null;
  const picture = pen.createImageData(wide, tall), data = picture.data, grain = seeded(907);
  const ember = rgb('ember'), bronze = rgb('bronze-deep'), haze = ember.map((v, i) => v + (bronze[i] - v) * FAR.dust);
  const dark = rgb('bg'), room = rgb('flame'), gone = Math.exp(-FAR.tall / FAR.falls);
  for (let r = 0; r < tall; r++) {
    const y = top + (r + 0.5) / dense;
    for (let c = 0; c < wide; c++) {
      const h = line[c] - y;
      if (h < -FAR.under) continue;
      const g = lit[c] * (h > 0 ? Math.max(0, (Math.exp(-h / FAR.falls) - gone) / (1 - gone)) : 1);
      let red = haze[0] * g, green = haze[1] * g, blue = haze[2] * g, a = Math.max(red, green, blue) / 255;
      for (const d of depths) {
        if (!d.tops[c] || d.feet[c] - y >= d.tops[c]) continue;
        const hides = d.kind.hides * shown[c], lamp = d.rooms?.[r * wide + c] ? d.kind.rooms : 0, front = d.kind.front * g;
        red = (lamp ? room[0] * lamp : dark[0] + haze[0] * front) * hides + red * (1 - hides);
        green = (lamp ? room[1] * lamp : dark[1] + haze[1] * front) * hides + green * (1 - hides);
        blue = (lamp ? room[2] * lamp : dark[2] + haze[2] * front) * hides + blue * (1 - hides);
        a = hides + a * (1 - hides);
      }
      // It is stored with a grain of one level, so a slow fall of light never shows as bands.
      const keep = h > -2 ? 1 : ramp(-FAR.under, -2, h), alpha = Math.min(255, Math.floor(a * keep * 255 + grain()));
      if (alpha <= 0 || a <= 0) continue;
      const i = (r * wide + c) * 4;
      data[i] = Math.min(255, red / a);
      data[i + 1] = Math.min(255, green / a);
      data[i + 2] = Math.min(255, blue / a);
      data[i + 3] = alpha;
    }
  }
  pen.putImageData(picture, 0, 0);
  canvas.before(under);
  return { dispose() { under.remove(); } };
}
