// The hero's world as pictures, for an iPad laid out wide (src/hero/picture/): the planet as one picture on a clear
// ground, and what broke away as many, each group of pieces that drifts as one cut out where it rests, with and
// without the stream's light on it, and packed onto pages. Taken from the live piece on its own lab page with the
// clock held, by the piece's own canvas. Take them again whenever the world has changed, from a production build
// of what is being pushed.
//
//   npm run picture [-- --url http://127.0.0.1:5333]
import process from 'node:process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browser, parseArgs, server } from '../lib.mjs';
import { CORE, HOST, drawn } from '../../src/pieces/world/layout.ts';
import { KIND, MOTION } from '../../src/pieces/world/parts/debris/motion.ts';
import { PICTURE } from '../../src/hero/picture/plan.ts';

const { flags } = parseArgs(process.argv.slice(2));
const S = PICTURE.scale, W = HOST.wide * S, H = HOST.tall * S;
const srv = await server(flags), b = await browser(flags);
const out = `public${PICTURE.dir}`;

// Where a piece is drawn on the canvas, in its pixels, as a box round it.
const boxOf = (at, big) => {
  const [dx, dy] = drawn(at[0], at[1], at[2]), k = drawn(at[0] + 1, at[1], at[2])[0] - dx, r = big * 1.8 * k + 5;
  return [(HOST.wide / 2 + dx - r) * S, (dy - r) * S, (HOST.wide / 2 + dx + r) * S, (dy + r) * S];
};
const round = (bx) => { const l = Math.max(0, Math.floor(bx[0])), t = Math.max(0, Math.floor(bx[1])), r = Math.min(W, Math.ceil(bx[2])), f = Math.min(H, Math.ceil(bx[3])); return [l, t, Math.max(0, r - l), Math.max(0, f - t)]; };
const mean = (list) => [0, 1, 2].map((a) => list.reduce((s, p) => s + p.at[a], 0) / list.length);
// Where a chip rests: its place along its fall at the start of the clock (src/hero/picture/drift.ts has the same).
const chipAt = (p) => {
  const span = MOTION.fall.from - MOTION.fall.to, u0 = (MOTION.fall.from - p.at[1]) / span, u = u0 - Math.floor(u0), s = u ** MOTION.fall.gather, k = 1 - MOTION.fall.pull * s, back = CORE.at[2] - MOTION.fall.behind;
  return [p.at[0] * k, MOTION.fall.from - span * s, back + (p.at[2] - back) * k];
};

try {
  const ctx = await b.newContext({ viewport: { width: HOST.wide, height: HOST.tall + 40 }, deviceScaleFactor: S });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${srv.base}/lab/piece/world?size=${HOST.tall}&wide=${HOST.wide}&label=0&ui=0&hook=1&lines=0`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => Boolean(window.__site), null, { timeout: 180000 });
  await page.waitForFunction(() => { try { return window.__site.piece('world').whole(); } catch { return false; } }, null, { timeout: 240000 });
  await page.evaluate((t) => window.__site.freeze(t), PICTURE.t);
  await page.evaluate(() => window.__site.settle());
  await page.waitForTimeout(1500);

  const size = await page.evaluate(() => { const c = document.querySelector('[data-piece="world"] canvas'); return [c.width, c.height]; });
  if (size[0] !== W || size[1] !== H) throw new Error(`picture: the world's canvas is ${size.join(' by ')} and not ${W} by ${H}: take it on a screen that draws the world at ${S} pixels to a unit`);
  const pieces = (await page.evaluate(() => window.__site.piece('world').debris().pieces())).map((p, id) => ({ ...p, id }));

  // The groups: pieces that drift as one. A family whose drift turns on how far back a piece is is cut by depth.
  const families = new Map();
  for (const p of pieces) { if (!families.has(p.family)) families.set(p.family, []); families.get(p.family).push(p); }
  const plates = new Map();
  for (const p of pieces) if (p.kind === KIND.plate && !plates.has(p.family)) plates.set(p.family, p.at);
  const cut = (list, n, by) => { const sorted = [...list].sort((a, c) => by(a) - by(c)), each = Math.ceil(sorted.length / n); return Array.from({ length: n }, (_, i) => sorted.slice(i * each, (i + 1) * each)).filter((l) => l.length); };
  const groups = [], chips = [];
  for (const [family, list] of families) {
    const kind = list[0].kind;
    if (kind === KIND.fall) { for (const p of list) chips.push({ id: p.id, at: p.at, pace: p.extra, box: round(boxOf(chipAt(p), p.big)) }); continue; }
    const slabs = kind === KIND.ring ? cut(list, PICTURE.slabs.ring, (p) => p.at[2]) : kind === KIND.whirl ? cut(list, PICTURE.slabs.whirl, (p) => p.at[2]) : kind === KIND.dust ? cut(list, PICTURE.slabs.dust, (p) => p.at[2]) : [list];
    for (const slab of slabs) {
      const bx = slab.map((p) => boxOf(p.at, p.big)).reduce((a, c) => [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])]);
      const plate = kind === KIND.ring ? { family: slab[0].extra, at: plates.get(slab[0].extra) } : undefined;
      groups.push({ kind, family, at: mean(slab), plate, extra: slab[0].extra, ids: slab.map((p) => p.id), box: round(bx) });
    }
  }
  // Far ones first, so a nearer family is laid over a further one.
  groups.sort((a, c) => a.at[2] - c.at[2]);
  console.log(`picture: ${pieces.length} pieces in ${groups.length} groups and ${chips.length} chips`);

  const made = await page.evaluate(async ({ T, groups, chips, P, W, H }) => {
    const w = window.__site.piece('world'), tools = w.debris(), core = w.core(), gl = document.querySelector('[data-piece="world"] canvas');
    const scratch = document.createElement('canvas');
    scratch.width = W; scratch.height = H;
    const g = scratch.getContext('2d', { willReadFrequently: true });
    const stream = (on) => { if (on) w.setStream(1, 10, P.run); else w.setStream(0, 61, 1); };
    // The piece draws at once when it is held, and its canvas is read before the browser takes the frame.
    const grab = ([x, y, ww, hh]) => { w.freeze(T); g.clearRect(0, 0, ww, hh); g.drawImage(gl, x, y, ww, hh, 0, 0, ww, hh); return g.getImageData(0, 0, ww, hh); };
    const crop = (im, [x, y, ww, hh]) => { const o = new ImageData(ww, hh); for (let r = 0; r < hh; r++) o.data.set(im.data.subarray(((y + r) * im.width + x) * 4, ((y + r) * im.width + x + ww) * 4), r * ww * 4); return o; };
    // The boxes round what is drawn in a pair of pictures: what touches, or nearly, is one box.
    const boxes = (a, c) => {
      const C = 12, cw = Math.ceil(a.width / C), ch = Math.ceil(a.height / C), cell = new Int32Array(cw * ch), seen = (i) => a.data[i + 3] > 5 || (c && c.data[i + 3] > 5);
      for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (seen((y * a.width + x) * 4)) cell[Math.floor(y / C) * cw + Math.floor(x / C)] = -1;
      let n = 0;
      for (let i = 0; i < cell.length; i++) {
        if (cell[i] !== -1) continue;
        n++;
        const todo = [i];
        cell[i] = n;
        while (todo.length) {
          const j = todo.pop(), cx = j % cw, cy = Math.floor(j / cw);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= cw || y >= ch || cell[y * cw + x] !== -1) continue;
            cell[y * cw + x] = n;
            todo.push(y * cw + x);
          }
        }
      }
      const bx = Array.from({ length: n }, () => [Infinity, Infinity, -Infinity, -Infinity]);
      for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
        if (!seen((y * a.width + x) * 4)) continue;
        const q = bx[cell[Math.floor(y / C) * cw + Math.floor(x / C)] - 1];
        if (x < q[0]) q[0] = x;
        if (y < q[1]) q[1] = y;
        if (x > q[2]) q[2] = x;
        if (y > q[3]) q[3] = y;
      }
      // A pixel of room round each, and any two that overlap are one.
      let list = bx.map((q) => [Math.max(0, q[0] - 1), Math.max(0, q[1] - 1), Math.min(a.width, q[2] + 2), Math.min(a.height, q[3] + 2)]);
      for (let again = true; again;) {
        again = false;
        for (let i = 0; i < list.length && !again; i++) for (let j = i + 1; j < list.length; j++) {
          const p = list[i], q = list[j];
          if (p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3]) { list[i] = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[2], q[2]), Math.max(p[3], q[3])]; list.splice(j, 1); again = true; break; }
        }
      }
      return list.map((q) => [q[0], q[1], q[2] - q[0], q[3] - q[1]]);
    };
    // How much the stream's light changes a cut: the mean change of its brightest channel, and the share of it that
    // changes plainly.
    const differs = (a, c) => {
      let n = 0, sum = 0, plain = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        if (c.data[i + 3] < 40) continue;
        const d = Math.max(Math.abs(a.data[i] - c.data[i]), Math.abs(a.data[i + 1] - c.data[i + 1]), Math.abs(a.data[i + 2] - c.data[i + 2]), Math.abs(a.data[i + 3] - c.data[i + 3]));
        n++; sum += d;
        if (d > 14) plain++;
      }
      return n ? [sum / n, plain / n] : [0, 0];
    };
    const cuts = [], put = (im) => { cuts.push(im); return cuts.length - 1; };

    // The planet, with nothing of what broke away, and where the stream's light changes it.
    tools.show([]);
    tools.rest(true);
    core.riders(false);
    stream(false);
    const dark = grab([0, 0, W, H]);
    const whole = document.createElement('canvas');
    whole.width = W; whole.height = H;
    whole.getContext('2d').putImageData(dark, 0, 0);
    const planet = whole.toDataURL('image/webp', P.quality.planet).split(',')[1];
    stream(true);
    const bright = grab([0, 0, W, H]);
    let nb = [Infinity, Infinity, -Infinity, -Infinity];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (Math.max(Math.abs(dark.data[i] - bright.data[i]), Math.abs(dark.data[i + 1] - bright.data[i + 1]), Math.abs(dark.data[i + 2] - bright.data[i + 2]), Math.abs(dark.data[i + 3] - bright.data[i + 3])) < 9) continue;
      if (x < nb[0]) nb[0] = x;
      if (y < nb[1]) nb[1] = y;
      if (x > nb[2]) nb[2] = x;
      if (y > nb[3]) nb[3] = y;
    }
    const neckBox = nb[2] >= nb[0] ? [Math.max(0, nb[0] - 4), Math.max(0, nb[1] - 4), Math.min(W, nb[2] + 5) - Math.max(0, nb[0] - 4), Math.min(H, nb[3] + 5) - Math.max(0, nb[1] - 4)] : null;
    // The rock as the stream lights it, and over it the neck of light alone: only what is as bright as the light
    // itself, so that a piece behind the neck is covered by it and one beside it is not.
    let neck = null, rock = null;
    if (neckBox) {
      const lit = crop(bright, neckBox), was = crop(dark, neckBox), light = new ImageData(new Uint8ClampedArray(lit.data), lit.width, lit.height);
      const ease = (a, c, v) => { const k = Math.min(1, Math.max(0, (v - a) / (c - a))); return k * k * (3 - 2 * k); };
      for (let i = 0; i < light.data.length; i += 4) {
        const d = Math.max(Math.abs(lit.data[i] - was.data[i]), Math.abs(lit.data[i + 1] - was.data[i + 1]), Math.abs(lit.data[i + 2] - was.data[i + 2]), Math.abs(lit.data[i + 3] - was.data[i + 3]));
        const luma = 0.299 * lit.data[i] + 0.587 * lit.data[i + 1] + 0.114 * lit.data[i + 2];
        light.data[i + 3] = Math.round(lit.data[i + 3] * ease(P.neck[0], P.neck[1], luma) * ease(20, 60, d));
      }
      rock = { box: neckBox, cut: put(lit) };
      neck = { box: neckBox, cut: put(light) };
    }
    // The shards that ride the neck, each cut out of what they add to it.
    const riders = [];
    if (neckBox) {
      const bare = crop(bright, neckBox);
      core.riders(true);
      const ridden = crop(grab([0, 0, W, H]), neckBox), only = new ImageData(new Uint8ClampedArray(ridden.data), ridden.width, ridden.height);
      for (let i = 0; i < only.data.length; i += 4) {
        const d = Math.max(Math.abs(ridden.data[i] - bare.data[i]), Math.abs(ridden.data[i + 1] - bare.data[i + 1]), Math.abs(ridden.data[i + 2] - bare.data[i + 2]), Math.abs(ridden.data[i + 3] - bare.data[i + 3]));
        only.data[i + 3] = Math.round(ridden.data[i + 3] * Math.min(1, Math.max(0, (d - 8) / 30)));
      }
      const found = boxes(only, null).filter((q) => q[2] * q[3] >= P.riders[1]).sort((p, r) => r[2] * r[3] - p[2] * p[3]).slice(0, P.riders[0]);
      for (const q of found) riders.push({ box: q, cut: put(crop(only, q)) });
      core.riders(false);
    }

    // What broke away, a group at a time, with every other part drawn as depth alone.
    w.without(['kept']);
    w.ghost(true);
    const outGroups = [];
    for (const G of groups) {
      if (G.box[2] < 2 || G.box[3] < 2) continue;
      tools.show(G.ids);
      stream(false);
      const off = grab(G.box);
      stream(true);
      const on = grab(G.box);
      const sprites = [];
      for (const q of boxes(off, on)) {
        const a = crop(off, q), c = crop(on, q), [m, share] = differs(a, c), lit = m > 2.2 || share > 0.02;
        sprites.push({ box: [G.box[0] + q[0], G.box[1] + q[1], q[2], q[3]], cut: put(a), lit: lit ? put(c) : -1, change: [Math.round(m * 10) / 10, Math.round(share * 1000) / 1000] });
      }
      if (sprites.length) outGroups.push({ kind: G.kind, family: G.family, at: G.at, plate: G.plate, extra: G.extra, sprites });
    }
    // The chips, each alone, as the stream lights it.
    stream(true);
    const outChips = [];
    for (const c of chips) {
      if (c.box[2] < 2 || c.box[3] < 2) continue;
      tools.show([c.id]);
      const im = grab(c.box), q = boxes(im, null).sort((p, r) => r[2] * r[3] - p[2] * p[3])[0];
      if (!q) continue;
      outChips.push({ at: c.at, pace: c.pace, box: [c.box[0] + q[0], c.box[1] + q[1], q[2], q[3]], cut: put(crop(im, q)) });
    }
    tools.show(null);
    tools.rest(false);
    core.riders(true);
    w.ghost(false);
    w.without([]);

    // Every cut laid onto pages, tallest first, in rows.
    const order = cuts.map((im, i) => i).sort((a, c) => cuts[c].height - cuts[a].height), where = new Array(cuts.length), pages = [];
    let pg = null;
    const open = () => { pg = { rows: [], w: 0, h: 0, x: 0, y: 0, row: 0 }; pages.push(pg); };
    open();
    for (const i of order) {
      const im = cuts[i], ww = im.width + P.gutter, hh = im.height + P.gutter;
      if (im.width > P.most || im.height > P.most) throw new Error(`a cut of ${im.width} by ${im.height} is larger than a page`);
      if (pg.x + ww > P.most) { pg.y += pg.row; pg.x = 0; pg.row = 0; }
      if (pg.y + hh > P.most) open();
      where[i] = [pages.length - 1, pg.x, pg.y];
      pg.x += ww;
      pg.row = Math.max(pg.row, hh);
      pg.w = Math.max(pg.w, pg.x);
      pg.h = Math.max(pg.h, pg.y + pg.row);
    }
    const files = pages.map((p, n) => {
      const c = document.createElement('canvas');
      c.width = p.w; c.height = p.h;
      const k = c.getContext('2d');
      cuts.forEach((im, i) => { if (where[i][0] === n) k.putImageData(im, where[i][1], where[i][2]); });
      return { size: [p.w, p.h], data: c.toDataURL('image/webp', P.quality.page).split(',')[1] };
    });
    return { planet, files, where, neck, rock, riders, ride: core.ride, groups: outGroups, chips: outChips, area: cuts.reduce((s, im) => s + im.width * im.height, 0) };
  }, { T: PICTURE.t, groups, chips, P: { run: PICTURE.run, most: PICTURE.most, gutter: PICTURE.gutter, quality: PICTURE.quality, neck: PICTURE.neck, riders: PICTURE.riders }, W, H });

  // In the host's units from here on.
  const u = (v) => Math.round((v / S) * 100) / 100, units = (bx) => bx.map(u);
  const sprite = (s) => ({ box: units(s.box), at: made.where[s.cut], ...(s.lit >= 0 ? { lit: made.where[s.lit] } : {}) });
  const join = (list) => { const l = Math.min(...list.map((q) => q[0])), t = Math.min(...list.map((q) => q[1])); return [l, t, Math.max(...list.map((q) => q[0] + q[2])) - l, Math.max(...list.map((q) => q[1] + q[3])) - t]; };
  // A group's cuts are laid in tiles, each a layer of its own in the page: cuts that lie near one another share a
  // tile, so a family spread thin over a wide place does not hold a layer as large as the place.
  const tiled = (sprites) => {
    const of = sprites.map((_, i) => i), top = (i) => { while (of[i] !== i) i = of[i] = of[of[i]]; return i; }, g = PICTURE.near / 2;
    for (let i = 0; i < sprites.length; i++) for (let j = i + 1; j < sprites.length; j++) {
      const p = sprites[i].box, q = sprites[j].box;
      if (p[0] - g < q[0] + q[2] + g && q[0] - g < p[0] + p[2] + g && p[1] - g < q[1] + q[3] + g && q[1] - g < p[1] + p[3] + g) of[top(i)] = top(j);
    }
    const sets = new Map();
    sprites.forEach((sp, i) => { const k = top(i); if (!sets.has(k)) sets.set(k, []); sets.get(k).push(sp); });
    return [...sets.values()].map((list) => ({ box: join(list.map((sp) => sp.box)).map((v) => Math.round(v * 100) / 100), sprites: list }));
  };
  const outGroups = made.groups.map((G) => { const sprites = G.sprites.map(sprite); return { kind: G.kind, family: G.family, at: G.at.map((v) => Math.round(v * 10) / 10), ...(G.plate ? { plate: G.plate } : {}), extra: G.extra, box: join(sprites.map((s) => s.box)).map((v) => Math.round(v * 100) / 100), tiles: tiled(sprites), lane: false }; });
  const neck = made.neck ? { box: units(made.neck.box), at: made.where[made.neck.cut] } : null, rock = made.rock ? { box: units(made.rock.box), at: made.where[made.rock.cut] } : null;
  // The lane: everything the stream's light changes, and the whole way the chips fall. A group any of which lies in
  // it is drawn there too, under the light, so what is in front of a lit thing stays in front of it.
  const cutsOf = (G) => G.tiles.flatMap((t) => t.sprites);
  const lit = [...(neck ? [neck.box] : []), ...outGroups.flatMap((G) => cutsOf(G).filter((s) => s.lit).map((s) => s.box))];
  const fall = [drawn(-130, MOTION.fall.from, CORE.at[2]), drawn(130, MOTION.fall.to, CORE.at[2])];
  lit.push([HOST.wide / 2 + fall[0][0], fall[0][1] - 20, fall[1][0] - fall[0][0], fall[1][1] - fall[0][1] + 40]);
  const lane = join(lit).map((v, i) => (i < 2 ? Math.floor(v) : Math.ceil(v) + 1));
  for (const G of outGroups) G.lane = G.box[0] < lane[0] + lane[2] && lane[0] < G.box[0] + G.box[2] && G.box[1] < lane[1] + lane[3] && lane[1] < G.box[1] + G.box[3];
  const layers = {
    pages: made.files.map((f) => f.size),
    rock, neck, lane, groups: outGroups,
    chips: made.chips.map((c) => ({ at: c.at, pace: c.pace, size: [u(c.box[2]), u(c.box[3])], on: made.where[c.cut] })),
    riders: made.riders.map((r) => ({ size: [u(r.box[2]), u(r.box[3])], on: made.where[r.cut] })),
    ride: made.ride,
  };

  mkdirSync(out, { recursive: true });
  const planet = Buffer.from(made.planet, 'base64');
  writeFileSync(`${out}/${PICTURE.planet}`, planet);
  console.log(`picture: ${out}/${PICTURE.planet} · ${W} by ${H} · ${(planet.length / 1024).toFixed(0)} KB`);
  made.files.forEach((f, i) => { const buf = Buffer.from(f.data, 'base64'); writeFileSync(`${out}/${PICTURE.page(i)}`, buf); console.log(`picture: ${out}/${PICTURE.page(i)} · ${f.size.join(' by ')} · ${(buf.length / 1024).toFixed(0)} KB`); });
  writeFileSync(`${out}/${PICTURE.layers}`, JSON.stringify(layers));
  const sprites = outGroups.reduce((s, G) => s + cutsOf(G).length, 0), lits = outGroups.reduce((s, G) => s + cutsOf(G).filter((q) => q.lit).length, 0), tiles = outGroups.reduce((s, G) => s + G.tiles.length * (G.lane ? 2 : 1), 0);
  console.log(`picture: ${outGroups.length} groups (${outGroups.filter((G) => G.lane).length} in the lane), ${tiles} tiles, ${sprites} cuts of them (${lits} lit), ${layers.chips.length} chips, ${layers.riders.length} riders, ${(made.area / 1e6).toFixed(1)} million pixels of cuts`);
  console.log(`picture: the lane is ${lane.join(', ')} · the neck ${neck ? neck.box.join(', ') : 'none'}`);
  const layerPx = outGroups.reduce((s, G) => s + G.tiles.reduce((k, t) => k + t.box[2] * t.box[3], 0) * S * S * (G.lane ? 2 : 1), 0);
  console.log(`picture: the tiles' layers come to ${(layerPx / 1e6).toFixed(1)} million pixels at ${S} to a unit`);
  if (errors.length) { console.log('ERRORS'); for (const e of errors) console.log(`  ${e}`); process.exitCode = 1; }
  await ctx.close();
} finally {
  await b.close();
  await srv.stop();
}
