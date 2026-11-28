import { hex, type PaletteName } from '../../config/palette';
import { HOST, LAND, drawn, noise, ramp, seeded } from './layout';

// The city going on behind the one that is built, as picture 10 has it (?look=d): a warm haze lying low over the
// land's far edge and, in it, far towers as soft shapes at three depths, paler the further, a few of their rooms lit.
// It is one picture, drawn once into a plain 2D canvas under the world's canvas: it shows only where the world is
// clear, and it costs nothing a frame. It never moves. Being under the world it can never lie in front of a built
// tower: the same haze among the city's own back rows is laid on by their shader (MIST in
// ./parts/towers/materials.ts, which takes the haze's numbers and its color from here, so the two stay one haze).
// `on: false` takes it out.
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
  most: 0.6,
  falls: 85,
  tall: 230,
  under: 8,
  // The thick of it, a bank lying among the towers, which is most of what picture 10's haze is: how bright it is,
  // where its middle is across the host, how far from there it is whole and gone, how many units over the land's
  // far edge it has thinned to half, and over how many units it thins (the fewer, the harder its top). The built
  // city hides all of it but its top, and it is nearly gone by the tall towers' tops, so the sky over the city is
  // as it was.
  low: { most: 1.3, at: 630, wide: [240, 440], half: 91, soft: 12 },
  // How much of it is missing in its thinnest banks, and how many units across a bank is.
  banks: [0.14, 300],
  // The far towers, furthest first: how wide and how tall over the far edge they are, in units, how much of what is
  // behind one it hides, how much of the haze is in front of it, how bright its lit rooms are (0: it has none), and
  // over how many units its edges melt into the haze, since a far thing seen through dust has no hard edge.
  towers: [
    { wide: [6, 12], tall: [60, 82], hides: 0.2, front: 0.84, rooms: 0, melts: 4 },
    { wide: [7, 14], tall: [58, 88], hides: 0.32, front: 0.74, rooms: 0.6, melts: 3 },
    { wide: [8, 16], tall: [54, 94], hides: 0.44, front: 0.64, rooms: 0.9, melts: 2.2 },
  ],
  // At how many places across a tower's edge is weighed to melt it.
  weighed: 5,
  // Where across the host the built city thins out, in units, and how much shorter the far towers are by the end of
  // that. Behind the thick of the city only a far tower's top shows, so they stand tall there. Right of it they are
  // seen whole in the gaps, and at that height they would stand as a second city and not a far one.
  thins: [[735, 880], 0.36],
  // How much haze a far tower needs round it to be seen whole. Where there is less it fades, so that none stands as
  // a dark shape against the clear sky.
  stands: 0.5,
  // Where across the host they begin and where they end, each over a fade, in units. They end as the bank does, so
  // that none is left standing dark where the haze has gone.
  ends: [[110, 260], [870, 1070]],
  // The share of their rooms that are lit, and how far apart rooms are across and up, in units.
  lit: 0.05,
  room: [4, 5],
} as const;

export interface Far {
  dispose(): void;
}

const rgb = (name: PaletteName): [number, number, number] => { const n = hex(name); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// The haze's color, in levels of 255: what the far picture is drawn in, and what the city's back rows go toward.
export const DUST: readonly number[] = rgb('ember').map((v, i) => v + (rgb('bronze-deep')[i] - v) * FAR.dust);

// The land's far edge as the host shows it, which the far towers stand on: how far down the host it is, at places
// across it.
export function farEdge(): [number, number][] {
  const mid = HOST.wide / 2, edge: [number, number][] = [];
  for (let i = 0; i <= 400; i++) {
    const x = LAND.rim * (i / 200 - 1), [dx, dy] = drawn(x, 0, -Math.sqrt(Math.max(0, LAND.rim * LAND.rim - x * x)));
    edge.push([mid + dx, dy]);
  }
  return edge;
}

export function far(canvas: HTMLCanvasElement, handheld: boolean): Far | null {
  if (!FAR.on) return null;
  const dense = FAR.dense[handheld ? 1 : 0], wide = HOST.wide * dense, edge = farEdge();
  const at = (x: number): number => {
    let i = 1;
    while (i < edge.length - 1 && edge[i][0] < x) i++;
    const [x0, y0] = edge[i - 1], [x1, y1] = edge[i], u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    return y0 + (y1 - y0) * u;
  };
  const top = Math.floor(Math.min(...edge.map((p) => p[1])) - FAR.tall), foot = Math.ceil(Math.max(...edge.map((p) => p[1]))) + FAR.under;
  const tall = (foot - top) * dense;

  const line = new Float32Array(wide), lit = new Float32Array(wide), low = new Float32Array(wide), shown = new Float32Array(wide);
  for (let c = 0; c < wide; c++) {
    const x = (c + 0.5) / dense, thin = 1 - FAR.banks[0] * noise(x / FAR.banks[1], 0.5, 0.5, 5);
    line[c] = at(x);
    lit[c] = FAR.most * (1 - ramp(FAR.wide[0], FAR.wide[1], Math.abs(x - FAR.at))) * thin;
    low[c] = FAR.low.most * (1 - ramp(FAR.low.wide[0], FAR.low.wide[1], Math.abs(x - FAR.low.at))) * thin;
    shown[c] = ramp(FAR.ends[0][0], FAR.ends[0][1], x) * (1 - ramp(FAR.ends[1][0], FAR.ends[1][1], x));
  }

  // Each depth of towers: over each column, how tall the tower there stands over its own foot, how far down the
  // host that foot is, and which pixels are lit rooms.
  const depths = FAR.towers.map((kind, k) => {
    const R = seeded(71 + k * 13), between = (r: readonly [number, number], bent = 1) => r[0] + (r[1] - r[0]) * R() ** bent;
    const tops = new Float32Array(wide), feet = new Float32Array(wide), rooms = kind.rooms > 0 ? new Uint8Array(wide * tall) : null;
    for (let x = FAR.ends[0][0] - R() * 12; x < FAR.ends[1][1];) {
      const w = Math.round(between(kind.wide)), middle = x + w / 2, base = at(middle);
      const h = between(kind.tall, 2.2) * (0.78 + 0.22 * (1 - ramp(120, 520, Math.abs(middle - FAR.at)))) * (1 - FAR.thins[1] * ramp(FAR.thins[0][0], FAR.thins[0][1], middle)), crown = R(), more = between([6, 18]), inset = between([0.2, 0.32]);
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
    // To melt its edges: how many pixels each way the places weighed are from a pixel, and, over each column, the
    // tallest and the highest standing of the towers within that reach, so a pixel clear of them all is passed over.
    const reach = Array.from({ length: FAR.weighed }, (_, i) => Math.round(((i / (FAR.weighed - 1) - 0.5) * kind.melts * dense)));
    const most = new Float32Array(wide), high = new Float32Array(wide);
    for (let c = 0; c < wide; c++) {
      for (const by of reach) {
        const n = Math.min(wide - 1, Math.max(0, c + by));
        if (!tops[n]) continue;
        if (!most[c] || feet[n] - tops[n] < high[c] - most[c]) { most[c] = tops[n]; high[c] = feet[n]; }
      }
    }
    return { kind, tops, feet, rooms, reach, most, high };
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
  const haze = DUST;
  const dark = rgb('bg'), room = rgb('flame'), gone = Math.exp(-FAR.tall / FAR.falls);
  for (let r = 0; r < tall; r++) {
    const y = top + (r + 0.5) / dense;
    for (let c = 0; c < wide; c++) {
      const h = line[c] - y;
      if (h < -FAR.under) continue;
      const g = lit[c] * (h > 0 ? Math.max(0, (Math.exp(-h / FAR.falls) - gone) / (1 - gone)) : 1) + low[c] / (1 + Math.exp((h - FAR.low.half) / FAR.low.soft));
      let red = haze[0] * g, green = haze[1] * g, blue = haze[2] * g, a = Math.max(red, green, blue) / 255;
      for (const d of depths) {
        if (!d.most[c] || d.most[c] - (d.high[c] - y) <= 0) continue;
        // How much of this pixel the depth's towers cover: 1 well inside one, less across its melted edge.
        let covers = 0;
        for (const by of d.reach) {
          const n = Math.min(wide - 1, Math.max(0, c + by));
          covers += Math.min(1, Math.max(0, (d.tops[n] - (d.feet[n] - y)) / d.kind.melts));
        }
        const hides = d.kind.hides * shown[c] * Math.min(1, g / FAR.stands) * (covers / FAR.weighed), lamp = d.rooms?.[r * wide + c] ? d.kind.rooms : 0, front = d.kind.front * g;
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
