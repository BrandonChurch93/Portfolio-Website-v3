import type { DeskPiece } from '../pieces/desk/index';
import { BAY, DESK, MAT, PLACES, SCREEN, SHADE, VIEW, WORD } from '../pieces/desk/layout';
import { registry } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { STREAM } from '../stream/config';
import type { RailShape } from '../stream/renderer';
import type { Cue, Rail } from '../stream/route';
import { routeThroughSkills } from '../stream/route-skills';
import { mountStream, type PlanContext, type Planned, type StreamHandle } from '../stream/stream';
import { clock } from '../world/clock';
import type { Anchor, StruckPiece, Way } from '../world/struck';
import { tiers } from '../world/tier';
import { ABOUT, BOARD, CX, SKILLS, SWING, swingOf, throwLine } from './plan';

// What the stream does to Skills and About. The page lays things out. This reads where they are, hands the stream's
// planner the places (src/stream/route-skills.ts), and in every frame brings each thing onto the page by how long
// the stream's leading end has been past the cue for it. That time runs back when the stream draws back, so
// everything goes away again in the reverse order, and a frozen frame is always the same picture.

export interface SkillsParts {
  // The element the stream is on, and the section's own part of it where that is not the whole of it.
  page: HTMLElement;
  root?: HTMLElement;
  board: HTMLElement;
  skills: HTMLElement;
  about: HTMLElement;
  pieces: () => { cpu: StruckPiece | null; reflector: StruckPiece | null; light: StruckPiece | null; desk: DeskPiece | null };
  way: () => Way;
}

export interface SkillsStage {
  // A change of tab: a pulse runs from over the tab that was pressed, through the studio light and in behind him,
  // and done is called as it passes, which is when the words change.
  tab(pressed: HTMLElement, done: () => void): void;
  // Plays the first row's thing coming to life again, where the stream is on it: the stream strikes it again.
  again(): void;
  dispose(): void;
}

type Span = readonly [from: number, to: number];
// When each thing comes on, in seconds after the cue that brings it: when it starts, and when it is whole.
const SHOW = {
  // The desk comes out of the dark as the stream nears it. Its lamp is on in the frame of the strike, and the rest
  // follow from left to right. The keys take half a second, which is how long their wave needs to be seen crossing.
  room: [0, 0.8] as Span,
  lamp: [0, 0.14] as Span,
  tablet: [0.2, 0.42] as Span,
  monitor: [0.4, 0.66] as Span,
  keys: [0.55, 1.05] as Span,
  pc: [0.9, 1.3] as Span,
  // The word on the floor comes on with the last of the desk's lights.
  word: [0.7, 1.3] as Span,
  // A row: its borders run out from the stream's side at the strike, its thing comes to life, then its name, then
  // its lists.
  rule: [0, 0.34] as Span,
  name: [0.4, 0.7] as Span,
  lists: [0.58, 0.94] as Span,
  // About: the studio light's light and his portrait at the light's strike, the glow as the stream goes in behind
  // him, and no word until all three are whole.
  beam: [0.02, 0.3] as Span,
  portrait: [0.04, 0.4] as Span,
  glow: [0, 0.26] as Span,
  heading: [0, 0.18] as Span,
  tabs: [0.05, 0.23] as Span,
  panel: [0.1, 0.3] as Span,
};
// How far a thing rises into place as it comes on, in the board's units.
const RISE = 10;
// A rule: half its thickness, in the stream's own units.
const RULE = { half: 2.4 };
// The way the lamp's shade faces where the stream strikes it. Where that is, is the desk's own (SHADE in its layout).
const SHADE_FACE = -2.3;
// The stream at the desk, once the lamp is lit: how much of its size it gives up, over which seconds after the
// strike, and how far toward the first row it stays turned down before it grows back.
const QUIET = { by: 0.4, over: [0.15, 1.1] as Span, back: 0.5 };
// The headphones on their stand, in the desk's millimetres: how high the middle of the hanging pair is, and half its
// width and half its height. The cursor brushing through that knocks them.
const HANG = { up: 330, half: [115, 140] };
// Half the word's length and half its depth on the floor, in the desk's millimetres, with room round it.
const WORD_HALF = [WORD.cap * 2.6, WORD.cap * 0.75];
// How long the leading end is followed past the top of Skills. Nothing waits on it now that the title is the desk's.
const LEAD = 0.2;
// How hard the stream strikes the first row again when its thing is asked to come to life again.
const AGAIN = 0.8;
// A change of tab: how long its pulse takes to reach him, and how far along that the words change.
const PULSE = { run: 0.46, swap: 0.62 };

// His outline, for keeping the stream off him: how wide the picture of it is kept, how solid a place has to be to
// count as him, and how far down his portrait his outline keeps the stream's shards and sparks off him.
const OUTLINE = { w: 300, solid: 40, foot: 1 };
// The block of About's words, as far down as it can reach, in the board's units from the top of About.
const WORDS_FOOT = 1000;

const RAD = Math.PI / 180;
type Quad = [number, number, number, number, number, number, number, number];
// Whether a place is inside a four sided shape whose corners are given in order round it.
const within = (x: number, y: number, q: Quad): boolean => {
  let side = 0;
  for (let i = 0; i < 8; i += 2) {
    const c = (q[(i + 2) % 8] - q[i]) * (y - q[i + 1]) - (q[(i + 3) % 8] - q[i + 1]) * (x - q[i]);
    if (c !== 0) { if (side && Math.sign(c) !== side) return false; side = Math.sign(c); }
  }
  return true;
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (age: number, [a, b]: Span) => { const k = clamp((age - a) / (b - a)); return k * k * (3 - 2 * k); };

// A page with more than this section on it mounts one stream for all of them and hands each section this in place
// of a stream of its own: it takes the section's plan and gives back the stream's handle.
export type StreamHost = (plan: (c: PlanContext) => Planned) => StreamHandle;

export function mountSkills(parts: SkillsParts, host?: StreamHost): SkillsStage {
  // Its own things are looked for inside its own part of the page: on a page with other sections, theirs have
  // parts of the same names.
  const root = parts.root ?? parts.page;
  const q = <T extends HTMLElement = HTMLElement>(part: string, within: Element = root) => within.querySelector<T>(`[data-part="${part}"]`)!;
  const all = (part: string) => [...root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)];
  const desk = q('desk');
  const rows = all('row'), names = all('name'), lists = all('lists'), thing = q('thing') as HTMLElement | null;
  const reflector = q('reflector'), light = q('light'), portrait = q('portrait'), cover = q('cover'), coverGlow = cover.firstElementChild as HTMLElement;
  const heading = q('about-title'), tabs = q('tabs'), panel = q('panel');
  const auras = all('aura'), beams = all('beam');

  let stream: StreamHandle | null = null, bench: DeskPiece | null = null, disposed = false, hush = 0, quietTo = 0, quietBack = 0;
  let anchors: { cpu: Anchor; reflector: Anchor; strike: Anchor; lens: Anchor } = { cpu: [-0.36, 0], reflector: [0, 0], strike: [0.02, -0.14], lens: [-0.12, 0.16] };
  let lives: Record<Way, number> = { shards: 1.3, band: 0.9, flash: 0.8 };
  let rules: Rail[] = [], cues: Cue[] = [];
  // The run over the top of About, as the page has it: from the reflector to where the stream strikes the light.
  let run = { ax: 0, ay: 0, bx: 1, by: 0 };
  // What the stream is never drawn over: the things on the desk and the block of About's words, as four sided
  // shapes, and his own outline, which leans with his portrait.
  let keepOff: { quads: Quad[]; l: number; t: number; r: number; b: number }[] = [];
  let outline: { a: Uint8Array; w: number; h: number } | null = null;
  let him = { l: 0, t: 0, w: 1, h: 1, dx: 0, dy: 0, k: 1 };
  let focused = false;
  const waiting: { at: number; done: () => void }[] = [];
  const swings: { t: number; a: number }[] = [];
  let struckAt = -100, way: Way | null = null;
  // When the first row's thing was last asked to come to life again, on the clock.
  let again: number | null = null;

  // A value is written to the page only when it has changed.
  const last = new Map<string, string>();
  const set = (key: string, el: HTMLElement, name: string, value: string) => { if (last.get(key) === value) return; last.set(key, value); el.style.setProperty(name, value); };
  const show = (key: string, el: HTMLElement, k: number, rise = RISE) => {
    set(`${key}:o`, el, 'opacity', k.toFixed(3));
    set(`${key}:t`, el, 'transform', k >= 1 ? 'none' : `translate3d(0, calc(var(--u) * ${((1 - k) * rise).toFixed(2)}), 0)`);
  };

  const place = () => {
    const A = ABOUT, T = throwLine();
    thing?.style.setProperty('--ax', String(anchors.cpu[0]));
    thing?.style.setProperty('--ay', String(anchors.cpu[1]));
    const put = (el: HTMLElement, x: number, y: number, host: number, a: Anchor) => { el.style.left = `calc(var(--u) * ${(x - a[0] * host - host / 2).toFixed(2)})`; el.style.top = `calc(var(--u) * ${(y - a[1] * host - host / 2).toFixed(2)})`; };
    put(reflector, A.reflector.x, A.reflector.y, A.reflector.host, anchors.reflector);
    put(light, T.lens[0], T.lens[1], A.light.host, anchors.lens);
  };

  const plan = (c: PlanContext): Planned => {
    const B = c.box(parts.board), k = (B.r - B.l) / BOARD.w, S0 = c.box(parts.skills).t, A0 = c.box(parts.about).t;
    const on = (x: number, y: number, top: number) => ({ x: B.l + x * k, y: top + y * k });
    const D = c.box(desk), shade = bench?.where(...SHADE);
    const R = SKILLS.rows, boxes = rows.map((r) => c.box(r)), T = throwLine(), a = ABOUT.line.angle * RAD;
    rules = [...boxes.map((r) => r.t), boxes[boxes.length - 1].b].map((y) => ({ ax: B.l + R.l * k, ay: y, bx: B.l + R.r * k, by: y, half: RULE.half * c.unit }));
    const lens = on(T.lens[0], T.lens[1], A0), host = ABOUT.light.host * k;
    const strike = { x: lens.x + (anchors.strike[0] - anchors.lens[0]) * host, y: lens.y + (anchors.strike[1] - anchors.lens[1]) * host };
    const face = on(ABOUT.reflector.x, ABOUT.reflector.y, A0);
    run = { ax: face.x, ay: face.y, bx: strike.x, by: strike.y };
    const W = ABOUT.words, Pt = ABOUT.portrait, words = [on(W.l, W.title - 8, A0), on(W.l + W.w, W.title - 8, A0), on(W.l + W.w, WORDS_FOOT, A0), on(W.l, WORDS_FOOT, A0)];
    const spot = (x: number, y: number, z: number) => { const [ax, ay] = bench!.where(x, y, z), tall = D.b - D.t; return [(D.l + D.r) / 2 + ax * tall, (D.t + D.b) / 2 + ay * tall]; };
    const quad = (...pts: [number, number, number][]) => pts.flatMap((p) => spot(...p)) as Quad;
    const floor = -DESK.H, sx = SCREEN.x, sw = SCREEN.w / 2, mx = MAT.x, mw = MAT.w / 2, md = MAT.d / 2;
    const quads: Quad[] = [words.flatMap((p) => [p.x, p.y]) as Quad, ...(bench ? [
      quad([sx - sw, SCREEN.low, SCREEN.z], [sx + sw, SCREEN.low, SCREEN.z], [sx + sw, SCREEN.low + SCREEN.h, SCREEN.z], [sx - sw, SCREEN.low + SCREEN.h, SCREEN.z]),
      quad([mx - mw, MAT.h, MAT.z - md], [mx + mw, MAT.h, MAT.z - md], [mx + mw, MAT.h, MAT.z + md], [mx - mw, MAT.h, MAT.z + md]),
      quad([BAY.l, floor, BAY.front], [BAY.r, floor, BAY.front], [BAY.r, floor + BAY.h, BAY.front], [BAY.l, floor + BAY.h, BAY.front]),
      quad([BAY.l, floor, BAY.back], [BAY.l, floor, BAY.front], [BAY.l, floor + BAY.h, BAY.front], [BAY.l, floor + BAY.h, BAY.back]),
      // The word on the floor, with a margin: the stream stays off it as it stays off About's words.
      quad([WORD.x - WORD_HALF[0], floor, WORD.z - WORD_HALF[1]], [WORD.x + WORD_HALF[0], floor, WORD.z - WORD_HALF[1]], [WORD.x + WORD_HALF[0], floor, WORD.z + WORD_HALF[1]], [WORD.x - WORD_HALF[0], floor, WORD.z + WORD_HALF[1]]),
    ] : [])];
    keepOff = quads.map((q) => ({ quads: [q], l: Math.min(q[0], q[2], q[4], q[6]), r: Math.max(q[0], q[2], q[4], q[6]), t: Math.min(q[1], q[3], q[5], q[7]), b: Math.max(q[1], q[3], q[5], q[7]) }));
    const corner = on(Pt.x, Pt.y, A0);
    him = { ...him, l: corner.x, t: corner.y, w: Pt.w * k, h: Pt.h * k, k };
    const route = routeThroughSkills({
      width: c.width, bottom: c.bottom, unit: c.unit, view: c.view, board: k, from: c.from,
      x: B.l + CX * k,
      leaves: S0 - SKILLS.lead * k,
      title: S0 + SKILLS.cue * k,
      lamp: { ...(shade ? { x: (D.l + D.r) / 2 + shade[0] * (D.b - D.t), y: (D.t + D.b) / 2 + shade[1] * (D.b - D.t) } : on(342, 296, S0)), face: SHADE_FACE },
      spine: B.l + SKILLS.spine * k,
      rows: boxes.map((r, i) => ({ x: B.l + (R.l - SKILLS.thing.meet) * k - STREAM.skills.shy * c.unit, y: (r.t + r.b) / 2 - (i ? 0 : SKILLS.thing.rise * SKILLS.thing.host * k) })),
      rules,
      reflector: { ...face, face: -ABOUT.reflector.face * RAD },
      light: { strike, face: Math.atan2(-Math.cos(a), -Math.sin(a)), lens },
      enter: on(T.enter[0], T.enter[1], A0),
      shows: on(T.shows[0], T.shows[1], A0),
      out: on(T.out[0], T.out[1], A0),
    });
    cues = route.cues ?? [];
    // This is asked for every point of the stream in every frame, so the two lengths are worked out here, once.
    const lampAt = cues.find((c) => c.name === 'lamp')?.s ?? 0;
    quietTo = cues.find((c) => c.name === 'row0')?.s ?? 0;
    quietBack = lampAt + (quietTo - lampAt) * QUIET.back;
    follow(cues);
    return {
      route,
      // A row's borders run out from the stream's side at its strike. The rule under a row is the rule over the next.
      rails: (since) => rules.flatMap((r, i): RailShape[] => {
        const g = ramp(since(`row${Math.max(0, i - 1)}`), SHOW.rule);
        return g <= 0.002 ? [] : [{ ...r, bx: r.ax + (r.bx - r.ax) * g, own: 1.3 + i * 0.37, blade: [1.5, 0.3], ends: [0, 0], keel: [0, 0, 0] }];
      }),
      after: frame,
      // Once the lamp is struck the stream is turned down from the top of the page to where it turns in to the first
      // row, so the desk it has just lit holds the eye. It is whole again by the first row.
      quiet: (s) => (hush <= 0 || s >= quietTo ? 1 : 1 - QUIET.by * hush * (s <= quietBack ? 1 : (quietTo - s) / Math.max(1, quietTo - quietBack))),
      off: (x, y) => {
        for (const o of keepOff) if (x >= o.l && x <= o.r && y >= o.t && y <= o.b && within(x, y, o.quads[0])) return true;
        if (!outline) return false;
        const fx = (x - him.l - him.dx) / him.w, fy = (y - him.t - him.dy) / him.h;
        return fx >= 0 && fx < 1 && fy >= 0 && fy < OUTLINE.foot && outline.a[Math.floor(fy * outline.h) * outline.w + Math.floor(fx * outline.w)] > OUTLINE.solid;
      },
    };
  };

  // How long each cue is followed for: as long as what it brings on takes, so that the moment the stream draws back
  // above it things begin to go.
  const follow = (cues: Cue[]) => {
    way = parts.way();
    const over: Record<string, number> = {
      title: LEAD, near: SHOW.room[1], lamp: SHOW.pc[1], row0: Math.max(SHOW.lists[1], lives[way] + 0.3), row1: SHOW.lists[1], row2: SHOW.lists[1],
      light: SHOW.portrait[1] + SHOW.panel[1], behind: SHOW.glow[1] + SHOW.panel[1],
    };
    for (const c of cues) if (over[c.name] !== undefined) { c.over = over[c.name]; stream?.follow(c.name, c.over); }
  };

  // The headphones' swing at a time: every knock they have had, each dying away.
  const swing = (t: number) => {
    let deg = 0;
    for (const s of swings) deg += swingOf(s.a, t - s.t);
    return deg;
  };

  const frame = (t: number) => {
    if (!stream || disposed) return;
    const whole = !stream.runs();
    if (root.hasAttribute('data-all') !== whole) root.toggleAttribute('data-all', whole);
    const since = (cue: string) => (whole ? 60 : stream!.since(cue));
    const P = parts.pieces();
    // The desk says where its things are drawn, so the route is planned again once it is there.
    if (P.desk !== bench) { bench = P.desk; queueMicrotask(() => stream?.replan()); }
    if (way !== parts.way()) follow(cues);

    // Skills: the desk, with the headphones on it and the title on its floor, and each row.
    const lampHit = stream.struck('lamp');
    if (lampHit.at > struckAt + 0.05 && !whole) { struckAt = lampHit.at; swings.push({ t: lampHit.at, a: SWING.struck * (0.5 + 0.5 * lampHit.hard) }); }
    while (swings.length && t - swings[0].t > SWING.lasts) swings.shift();
    bench?.setSwing(whole ? 0 : (swing(t) * Math.PI) / 180);
    const near = since('near'), lit = since('lamp');
    hush = whole ? 1 : ramp(lit, QUIET.over);
    set('desk:o', desk, 'opacity', near > 0 ? '1' : '0');
    bench?.setStream(whole ? 1 : lampHit.on, whole ? 60 : t - lampHit.at);
    bench?.setLights({ room: ramp(near, SHOW.room), lamp: lit > 0 ? 0.6 + 0.4 * ramp(lit, SHOW.lamp) : 0, tablet: ramp(lit, SHOW.tablet), monitor: ramp(lit, SHOW.monitor), keys: ramp(lit, SHOW.keys), pc: ramp(lit, SHOW.pc), word: ramp(lit, SHOW.word) });
    rows.forEach((_, i) => {
      const age = since(`row${i}`);
      show(`name${i}`, names[i], ramp(age, SHOW.name));
      show(`lists${i}`, lists[i], ramp(age, SHOW.lists));
    });
    const row0 = since('row0'), hit0 = stream.struck('row0');
    if (thing) set('thing:o', thing, 'opacity', row0 > 0 ? '1' : '0');
    if (again !== null && (t - again >= row0 || row0 <= 0)) again = null;
    P.cpu?.setLife?.(parts.way(), whole ? 60 : again === null ? row0 : Math.max(0.001, t - again));
    P.cpu?.setStream(whole ? 1 : hit0.on, whole ? 60 : t - hit0.at);

    // About: the reflector and the studio light are always there. The light's light and his portrait come on at the
    // light's strike, the glow as the stream goes in behind him, and the words only once all of that is whole.
    const hitR = stream.struck('reflector'), hitL = stream.struck('light');
    P.reflector?.setStream(whole ? 1 : hitR.on, whole ? 60 : t - hitR.at);
    P.light?.setStream(whole ? 1 : hitL.on, whole ? 60 : t - hitL.at);
    const on = focused ? 60 : since('light'), behind = focused ? 60 : since('behind');
    const beam = ramp(on, SHOW.beam), face = ramp(on, SHOW.portrait), glow = ramp(behind, SHOW.glow);
    beams.forEach((el, i) => set(`beam${i}`, el, 'opacity', beam.toFixed(3)));
    auras.forEach((el, i) => set(`aura${i}`, el, 'opacity', glow.toFixed(3)));
    // He leans away from the cursor, and his outline over the stream leans with him.
    const L = lamp.get(), lx = (-(L.x - 0.5) * ABOUT.lean).toFixed(2), ly = (-(L.y - 0.5) * ABOUT.lean * 0.57 + (1 - face) * 16).toFixed(2);
    him.dx = Number(lx) * him.k;
    him.dy = Number(ly) * him.k;
    set('portrait:o', portrait, 'opacity', face.toFixed(3));
    set('portrait:t', portrait, 'transform', `translate3d(calc(var(--u) * ${lx}), calc(var(--u) * ${ly}), 0)`);
    set('cover:t', cover, 'transform', `translate3d(calc(var(--u) * ${lx}), calc(var(--u) * ${ly}), 0)`);
    set('cover:g', coverGlow, 'transform', `translate3d(calc(var(--u) * ${-Number(lx)}), calc(var(--u) * ${-Number(ly)}), 0)`);
    const words = Math.min(on - SHOW.portrait[1], behind - SHOW.glow[1]);
    show('heading', heading, ramp(words, SHOW.heading));
    show('tabs', tabs, ramp(words, SHOW.tabs));
    show('panel', panel, ramp(words, SHOW.panel));
    set('words:p', tabs, 'pointer-events', words > 0 ? 'auto' : 'none');

    for (let i = waiting.length - 1; i >= 0; i--) if (t >= waiting[i].at) waiting.splice(i, 1)[0].done();
  };

  // Where the stream cannot run at all, the page is whole.
  const idle = clock.onFrame((t) => { if (!stream?.runs()) frame(t); });

  // The cursor brushing past the headphones knocks them: harder the faster it goes, and the way it was going.
  let before: { x: number; t: number } | null = null;
  const brush = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!bench) return;
    const r = desk.getBoundingClientRect(), [ax, ay] = bench.where(PLACES.headphones[0], HANG.up, PLACES.headphones[1]), k = r.height / (VIEW.tall * 1000);
    const inside = Math.abs(e.clientX - (r.left + r.width / 2 + ax * r.height)) < HANG.half[0] * k && Math.abs(e.clientY - (r.top + r.height / 2 + ay * r.height)) < HANG.half[1] * k, now = clock.now();
    if (inside && before && now - before.t < 0.2 && now - (swings[swings.length - 1]?.t ?? -9) > 0.35) {
      const v = (e.clientX - before.x) / Math.max(0.004, now - before.t);
      if (Math.abs(v) > 60) swings.push({ t: now, a: Math.sign(v) * Math.min(SWING.brush, 1.5 + Math.abs(v) / 260) });
    }
    before = inside ? null : { x: e.clientX, t: now };
  };
  addEventListener('pointermove', brush, { passive: true });

  // Keyboard focus on anything in About brings the whole of About on at once.
  const focusIn = () => { focused = true; }, focusOut = (e: FocusEvent) => { if (!parts.about.contains(e.relatedTarget as Node | null)) focused = false; };
  parts.about.addEventListener('focusin', focusIn);
  parts.about.addEventListener('focusout', focusOut);

  // His outline is read off the picture his portrait is cut from.
  const cut = new Image();
  cut.src = '/media/portrait-cut-960.webp';
  void cut.decode().then(() => {
    const c = document.createElement('canvas');
    c.width = OUTLINE.w;
    c.height = Math.round((OUTLINE.w * cut.naturalHeight) / cut.naturalWidth);
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g || disposed) return;
    g.drawImage(cut, 0, 0, c.width, c.height);
    const px = g.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
    for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3];
    outline = { a, w: c.width, h: c.height };
  }).catch(() => undefined);

  lamp.bind();
  tiers.detect();
  place();
  void registry.track(Promise.all([import('../pieces/cpu/index'), import('../pieces/reflector/index'), import('../pieces/studio-light/index')]).then(([cpu, refl, studio]) => {
    if (disposed) return;
    anchors = { cpu: cpu.CPU.strike, reflector: refl.REFLECTOR.strike, strike: studio.STUDIO.strike, lens: studio.STUDIO.lens };
    lives = cpu.LIFE;
    place();
    stream = host ? host(plan) : mountStream(parts.page, { plan });
  }));

  // For checking: which of the things the stream is kept off a place is over. 0 is About's words, and 1 on are the
  // things on the desk. -1 is none of them.
  registry.tool('skillsOff', (x: number, y: number) => keepOff.findIndex((o) => x >= o.l && x <= o.r && y >= o.t && y <= o.b && within(x, y, o.quads[0])));

  return {
    tab(pressed, done) {
      if (!stream || !stream.runs() || focused && stream.since('behind') <= 0 || stream.since('behind') < SHOW.glow[1]) { done(); return; }
      const r = pressed.getBoundingClientRect(), h = parts.page.getBoundingClientRect(), x = r.left + r.width / 2 - h.left;
      const k = clamp((x - run.ax) / (run.bx - run.ax)), from = stream.nearest(run.ax + (run.bx - run.ax) * k, run.ay + (run.by - run.ay) * k, stream.reached('reflector'));
      stream.pulse(from, stream.reached('behind'), PULSE.run);
      waiting.push({ at: clock.now() + PULSE.run * PULSE.swap, done });
    },
    again() {
      if (!stream?.runs() || stream.since('row0') < lives[parts.way()]) return;
      again = clock.now();
      stream.strike('row0', AGAIN);
    },
    dispose() {
      disposed = true;
      idle();
      removeEventListener('pointermove', brush);
      parts.about.removeEventListener('focusin', focusIn);
      parts.about.removeEventListener('focusout', focusOut);
      if (!host) stream?.dispose();
      root.removeAttribute('data-all');
    },
  };
}
