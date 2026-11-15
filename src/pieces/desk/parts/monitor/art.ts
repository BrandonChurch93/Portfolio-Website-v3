import * as THREE from 'three';
import { palette } from '../../../../config/palette';
import { EDITOR, LAYERS, PAGE, type Rect } from './frame';

// What the screen shows, drawn once on 2D canvases in millimetres and handed to the screen's shader as textures: the
// wallpaper, the editor with his code, the page that code is running (without its stream, which the shader draws
// alive), the small panel that floats, and the pointer. Nothing here is a real product's interface.

const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';
const SANS = '"Sora Variable", "Sora", system-ui, sans-serif';

type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

const INK = {
  ground: '#0b0a09',
  well: '#11100f',
  raised: '#181615',
  rule: '#2a2724',
  rim: '#4a4540',
  kw: '#f3e3cd',
  fn: palette.flame,
  type: '#e6d4bd',
  str: '#e9d9c8',
  num: palette.hot,
  name: '#d2c3b5',
  prop: '#c9bbad',
  punct: '#8e847a',
  dim: palette['text-3'],
  faint: '#5d5650',
  ember: palette.ember,
  copper: palette.copper,
  bronze: palette.bronze,
  pale: palette.pale,
} as const;

function sheet(wmm: number, hmm: number, ppm: number): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.round(wmm * ppm);
  c.height = Math.round(hmm * ppm);
  const g = c.getContext('2d') as Ctx;
  g.setTransform(c.width / wmm, 0, 0, c.height / hmm, 0, 0);
  g.textBaseline = 'middle';
  return { c, g };
}

function texture(c: HTMLCanvasElement, maxAniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function text(g: Ctx, s: string, x: number, y: number, size: number, color: string, o: { font?: string; weight?: number; align?: CanvasTextAlign; space?: number; italic?: boolean } = {}): number {
  g.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 450} ${size}px ${o.font ?? MONO}`;
  g.letterSpacing = `${(o.space ?? 0) * size}px`;
  g.textAlign = o.align ?? 'left';
  g.fillStyle = color;
  g.fillText(s, x, y);
  return g.measureText(s).width;
}

function round(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// A window's ground, with the hairline of light round its edge that a dark interface draws to lift it off what is
// behind it.
function windowGround(g: Ctx, w: number, h: number, r: number, fill: string): void {
  round(g, 0, 0, w, h, r);
  g.fillStyle = fill;
  g.fill();
  const rim = g.createLinearGradient(0, 0, 0, h);
  rim.addColorStop(0, '#6b645c');
  rim.addColorStop(0.08, INK.rim);
  rim.addColorStop(1, '#24211f');
  g.strokeStyle = rim;
  g.lineWidth = 0.35;
  round(g, 0.18, 0.18, w - 0.36, h - 0.36, r - 0.18);
  g.stroke();
}

const KEYWORDS = new Set(['import', 'from', 'export', 'function', 'const', 'let', 'for', 'of', 'if', 'continue', 'return', 'type', 'void', 'new', 'while', 'else']);

// Colors one line of TypeScript, token by token.
function code(g: Ctx, line: string, x: number, y: number, size: number, cw: number): void {
  const comment = line.indexOf('//');
  const body = comment >= 0 ? line.slice(0, comment) : line;
  const re = /('[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let col = 0, m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const s = m[0];
    let ink: string = INK.punct;
    if (m[1]) ink = INK.str;
    else if (m[2]) ink = INK.num;
    else if (m[3]) {
      const next = body.slice(re.lastIndex).trimStart()[0];
      const prev = body.slice(0, m.index).trimEnd().slice(-1);
      ink = KEYWORDS.has(s) ? INK.kw : next === '(' ? INK.fn : /^[A-Z]/.test(s) ? INK.type : prev === '.' ? INK.prop : INK.name;
    }
    if (!m[4]) text(g, s, x + col * cw, y, size, ink, { weight: KEYWORDS.has(s) ? 560 : 450 });
    col += s.length;
  }
  if (comment >= 0) text(g, line.slice(comment), x + comment * cw, y, size, INK.dim, { italic: true });
}

// The file open in the editor: the stream's simulation, as it might stand in this repo.
const SOURCE = [
  "import { clock } from '../world/clock';",
  "import { stream } from './config';",
  "import type { Route, Shard } from './route';",
  '',
  '// A riding shard keeps its place on the route. A strike throws it.',
  'export function stepShards(route: Route, shards: Shard[], dt: number): void {',
  '  const reach = route.length * clock.ease(stream.reach);',
  '  for (const s of shards) {',
  '    if (s.thrown) {',
  '      s.vy -= stream.fall * dt;',
  '      s.x += s.vx * dt;',
  '      s.y += s.vy * dt;',
  '      s.spin += s.turn * dt;',
  '      if (s.y < s.floor) bounce(s, stream.give);',
  '      continue;',
  '    }',
  '    s.at = Math.min(reach, s.at + s.pace * dt);',
  '    const p = route.point(s.at);',
  '    s.x = p.x + Math.cos(s.phase) * s.lift;',
  '    s.y = p.y + Math.sin(s.phase) * s.lift;',
  '    s.phase += stream.sway * dt;',
  '  }',
  '}',
  '',
  '// It comes to rest on the rule it landed on.',
  'function bounce(s: Shard, give: number): void {',
  '  s.y = s.floor;',
  '  s.vy = -s.vy * give;',
];
const FIRST_LINE = 118;
// Where the caret stands: which line of SOURCE, after which column.
const CARET: [line: number, col: number] = [20, 31];

export interface Art {
  wall: THREE.CanvasTexture;
  editor: THREE.CanvasTexture;
  page: THREE.CanvasTexture;
  panel: THREE.CanvasTexture;
  pointer: THREE.CanvasTexture;
  // The caret, in millimetres on the editor from its lower left corner: its middle, and its height.
  caret: [x: number, y: number, h: number];
  // The running page's stream, in millimetres on the page from its lower left corner: where its own area starts.
  pageTop: number;
}

const extent = (r: Rect): [number, number] => [r[2] - r[0], r[3] - r[1]];

function drawWall(wmm: number, hmm: number): HTMLCanvasElement {
  const { c, g } = sheet(wmm, hmm, 2.4);
  const base = g.createLinearGradient(0, 0, 0, hmm);
  base.addColorStop(0, '#0d0c0b');
  base.addColorStop(1, '#131210');
  g.fillStyle = base;
  g.fillRect(0, 0, wmm, hmm);
  // A broad warm light low on the right, as behind his portrait.
  const glow = g.createRadialGradient(wmm * 0.78, hmm * 0.92, 10, wmm * 0.72, hmm * 0.9, wmm * 0.6);
  glow.addColorStop(0, 'rgba(120, 58, 8, 0.28)');
  glow.addColorStop(0.4, 'rgba(91, 47, 0, 0.1)');
  glow.addColorStop(1, 'rgba(31, 11, 0, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, wmm, hmm);
  // Long faint arcs, an echo of the stream, where the windows leave the wallpaper bare.
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = `rgba(150, 140, 128, ${0.035 + 0.008 * i})`;
    g.lineWidth = 0.6 + i * 0.15;
    g.beginPath();
    g.moveTo(-20, hmm * (0.98 - i * 0.035));
    g.bezierCurveTo(wmm * 0.3, hmm * (0.55 - i * 0.05), wmm * 0.62, hmm * (1.05 - i * 0.03), wmm + 20, hmm * (0.62 - i * 0.06));
    g.stroke();
  }
  // The bar along the top.
  const bar = 8;
  g.fillStyle = 'rgba(8, 7, 7, 0.82)';
  g.fillRect(0, 0, wmm, bar);
  g.fillStyle = '#2a2724';
  g.fillRect(0, bar - 0.25, wmm, 0.25);
  g.fillStyle = INK.copper;
  round(g, 6, 2.2, 3.6, 3.6, 0.8);
  g.fill();
  let x = 15;
  for (const w of ['Files', 'Edit', 'View', 'Run']) x += text(g, w, x, bar / 2, 3.1, w === 'Files' ? INK.name : INK.dim, { font: SANS, weight: w === 'Files' ? 600 : 450 }) + 6;
  text(g, 'Fri 21:47', wmm - 6, bar / 2, 3.1, INK.name, { font: SANS, align: 'right', weight: 500 });
  g.fillStyle = INK.dim;
  for (let i = 0; i < 3; i++) { round(g, wmm - 42 - i * 7, 2.6, 4, 2.8, 0.7); g.fill(); }
  return c;
}

function drawEditor(): { c: HTMLCanvasElement; caret: [number, number, number] } {
  const [w, h] = extent(LAYERS.editor.rect);
  const { c, g } = sheet(w, h, 4.8);
  const r = LAYERS.editor.round;
  g.save();
  round(g, 0, 0, w, h, r);
  g.clip();
  g.fillStyle = INK.ground;
  g.fillRect(0, 0, w, h);

  const E = EDITOR;
  // Title strip.
  g.fillStyle = '#141311';
  g.fillRect(0, 0, w, E.title);
  g.fillStyle = INK.copper;
  round(g, 5, E.title / 2 - 1.6, 3.2, 3.2, 0.7);
  g.fill();
  text(g, 'sim.ts', w / 2, E.title / 2, 3.2, INK.name, { align: 'center', font: SANS, weight: 500 });
  text(g, '· portfolio-website-v3', w / 2 + 9, E.title / 2, 3.2, INK.dim, { font: SANS });

  // The file tree.
  const tree = E.tree, top = E.title, foot = h - E.status;
  g.fillStyle = '#0e0d0c';
  g.fillRect(0, top, tree, foot - top);
  g.fillStyle = INK.rule;
  g.fillRect(tree - 0.3, top, 0.3, foot - top);
  text(g, 'FILES', 6, top + 6, 2.6, INK.dim, { weight: 600, space: 0.14, font: SANS });
  const files: [depth: number, name: string, kind: 'dir' | 'file', on?: boolean][] = [
    [0, 'src', 'dir'], [1, 'app', 'dir'], [1, 'config', 'dir'], [1, 'metal', 'dir'], [1, 'pieces', 'dir'], [2, 'desk', 'dir'],
    [1, 'skills', 'dir'], [2, 'plan.ts', 'file'], [2, 'stage.ts', 'file'], [1, 'stream', 'dir'], [2, 'config.ts', 'file'],
    [2, 'renderer.ts', 'file'], [2, 'route.ts', 'file'], [2, 'route-skills.ts', 'file'], [2, 'shaders.ts', 'file'],
    [2, 'shards.ts', 'file'], [2, 'sim.ts', 'file', true], [2, 'stone.ts', 'file'], [2, 'stream.ts', 'file'], [2, 'surge.ts', 'file'],
    [1, 'world', 'dir'], [2, 'clock.ts', 'file'], [2, 'stage.ts', 'file'], [0, 'reference', 'dir'], [0, 'scripts', 'dir'],
    [0, 'BRIEF.md', 'file'], [0, 'PLAN.md', 'file'], [0, 'QUALITY.md', 'file'],
  ];
  const row = 6.6;
  files.forEach(([d, name, kind, on], i) => {
    const y = top + 14 + i * row, x = 6 + d * 5;
    if (y > foot - 4) return;
    if (on) {
      g.fillStyle = '#262321';
      g.fillRect(0, y - row / 2, tree - 0.3, row);
      g.fillStyle = INK.fn;
      g.fillRect(0, y - row / 2, 0.7, row);
    }
    if (d > 0) { g.fillStyle = '#211f1c'; for (let k = 0; k < d; k++) g.fillRect(7.2 + k * 5, y - row / 2, 0.22, row); }
    if (kind === 'dir') {
      g.strokeStyle = INK.dim;
      g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + 1.1, y + 0.3); g.lineTo(x + 2.2, y - 1); g.stroke();
      text(g, name, x + 4, y, 3.1, INK.name, { font: SANS, weight: 500 });
    } else {
      g.fillStyle = name.endsWith('.md') ? INK.dim : on ? INK.fn : INK.copper;
      g.globalAlpha = on ? 1 : 0.7;
      g.fillRect(x + 0.6, y - 1.1, 2, 2.2);
      g.globalAlpha = 1;
      text(g, name, x + 4, y, 3.1, on ? INK.pale : INK.prop, { font: SANS, weight: on ? 550 : 420 });
    }
  });

  // Tabs.
  const x0 = tree;
  g.fillStyle = '#0d0c0b';
  g.fillRect(x0, top, w - x0, E.tabs);
  let tx = x0;
  for (const [name, on] of [['sim.ts', true], ['route.ts', false], ['stage.ts', false], ['config.ts', false]] as const) {
    const tw = 30;
    g.fillStyle = on ? INK.ground : '#12110f';
    g.fillRect(tx, top, tw, E.tabs);
    if (on) { g.fillStyle = INK.fn; g.fillRect(tx, top, tw, 0.6); }
    g.fillStyle = INK.rule;
    g.fillRect(tx + tw - 0.25, top, 0.25, E.tabs);
    g.fillStyle = name.endsWith('.md') ? INK.dim : INK.copper;
    g.globalAlpha = on ? 1 : 0.6;
    g.fillRect(tx + 4, top + E.tabs / 2 - 1, 2, 2);
    g.globalAlpha = 1;
    text(g, name, tx + 8, top + E.tabs / 2, 3.1, on ? INK.pale : INK.dim, { font: SANS, weight: on ? 550 : 420 });
    tx += tw;
  }
  g.fillStyle = INK.rule;
  g.fillRect(x0, top + E.tabs - 0.25, w - x0, 0.25);
  // The path to where the caret is.
  const cy = top + E.tabs + E.crumbs / 2;
  let bx = x0 + 6;
  for (const [i, s] of ['src', 'stream', 'sim.ts', 'stepShards'].entries()) {
    if (i) { text(g, '›', bx, cy, 2.9, INK.faint, { font: SANS }); bx += 3.4; }
    bx += text(g, s, bx, cy, 2.8, i === 3 ? INK.fn : INK.dim, { font: SANS }) + 2;
  }

  // The code, with its gutter.
  const codeTop = top + E.tabs + E.crumbs + 2, size = 3.75, cw = size * 0.6, L = E.line;
  const gutter = x0 + 16, left = gutter + 6;
  const rows = Math.floor((h - E.status - E.terminal - codeTop) / L);
  let caret: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < Math.min(rows, SOURCE.length); i++) {
    const y = codeTop + (i + 0.5) * L, line = SOURCE[i], here = i === CARET[0];
    if (here) {
      g.fillStyle = '#1a1816';
      g.fillRect(x0, y - L / 2, w - x0, L);
      caret = [left + CARET[1] * cw, h - y, L * 0.72];
    }
    text(g, String(FIRST_LINE + i), gutter, y, 3.1, here ? INK.name : INK.faint, { align: 'right' });
    const indent = line.length - line.trimStart().length;
    g.fillStyle = '#201e1c';
    for (let k = 2; k <= indent; k += 2) g.fillRect(left + (k - 2) * cw + 0.4, y - L / 2, 0.22, L);
    code(g, line, left, y, size, cw);
  }
  // The scroll bar on the right, where the page covers most of the editor.
  g.fillStyle = '#211f1c';
  g.fillRect(w - 3.2, codeTop, 1.6, 40);

  // The terminal under the code.
  const ty = h - E.status - E.terminal;
  g.fillStyle = '#0a0909';
  g.fillRect(x0, ty, w - x0, E.terminal);
  g.fillStyle = INK.rule;
  g.fillRect(x0, ty, w - x0, 0.3);
  let hx = x0 + 6;
  for (const [s, on] of [['TERMINAL', true], ['OUTPUT', false], ['PROBLEMS', false]] as const) {
    const tw = text(g, s, hx, ty + 5, 2.5, on ? INK.name : INK.dim, { font: SANS, weight: 600, space: 0.12 });
    if (on) { g.fillStyle = INK.fn; g.fillRect(hx, ty + 8.4, tw, 0.45); }
    hx += tw + 8;
  }
  const term: [string, string][] = [
    ['$ ', 'npm run dev'],
    ['  ', 'ready on 127.0.0.1:5330'],
    ['  ✓ ', 'compiled /lab/skills in 412 ms'],
    ['  ✓ ', 'stream · 212 shards · 6.1 ms a frame'],
    ['$ ', 'npm run shot -- /lab/skills --t 4'],
    ['  ', 'shot: shots/skills.jpg · hardware'],
    ['$ ', ''],
  ];
  term.forEach(([p, s], i) => {
    const y = ty + 15 + i * 6.6;
    const pw = text(g, p, x0 + 6, y, 3.3, p.startsWith('$') ? INK.fn : p.includes('✓') ? INK.type : INK.dim);
    text(g, s, x0 + 6 + pw, y, 3.3, p.startsWith('$') ? INK.name : INK.prop);
    if (i === term.length - 1) { g.fillStyle = INK.name; g.globalAlpha = 0.85; g.fillRect(x0 + 6 + pw + 0.4, y - 2, 2, 4); g.globalAlpha = 1; }
  });

  // The status bar.
  g.fillStyle = '#2c2926';
  g.fillRect(0, h - E.status, w, E.status);
  const sy = h - E.status / 2;
  let sx = 5;
  for (const s of ['main', '0 problems']) sx += text(g, s, sx, sy, 2.7, '#e8d8c8', { font: SANS, weight: 500 }) + 7;
  let rx = w - 5;
  for (const s of ['TypeScript', 'UTF-8', `Ln ${FIRST_LINE + CARET[0]}, Col ${CARET[1] + 1}`]) { text(g, s, rx, sy, 2.7, '#e8d8c8', { font: SANS, weight: 500, align: 'right' }); g.font = `500 2.7px ${SANS}`; rx -= g.measureText(s).width + 7; }
  g.restore();
  windowGround(g, w, h, r, 'rgba(0,0,0,0)');
  return { c, caret };
}

function drawPage(): { c: HTMLCanvasElement; top: number } {
  const [w, h] = extent(LAYERS.page.rect);
  const { c, g } = sheet(w, h, 4.1);
  const r = LAYERS.page.round;
  g.save();
  round(g, 0, 0, w, h, r);
  g.clip();
  g.fillStyle = '#070706';
  g.fillRect(0, 0, w, h);
  // Its bar: back and forward, the address, and reload.
  const B = PAGE.bar;
  g.fillStyle = '#151412';
  g.fillRect(0, 0, w, B);
  g.fillStyle = INK.rule;
  g.fillRect(0, B - 0.25, w, 0.25);
  g.strokeStyle = INK.dim;
  g.lineWidth = 0.4;
  g.lineCap = 'round';
  for (const [x, d] of [[7, -1], [14, 1]] as const) { g.beginPath(); g.moveTo(x - d * 1, B / 2 - 1.6); g.lineTo(x + d * 1, B / 2); g.lineTo(x - d * 1, B / 2 + 1.6); g.stroke(); }
  g.beginPath(); g.arc(22, B / 2, 1.6, -0.4, Math.PI * 1.55); g.stroke();
  round(g, 30, 2.2, w - 60, B - 4.4, (B - 4.4) / 2);
  g.fillStyle = '#0b0a09';
  g.fill();
  const ax = 36 + text(g, '127.0.0.1:5330', 36, B / 2, 3.1, INK.name, { font: SANS, weight: 500 });
  text(g, '/lab/skills', ax, B / 2, 3.1, INK.dim, { font: SANS });
  g.fillStyle = INK.fn;
  g.beginPath(); g.arc(w - 36, B / 2, 0.9, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = INK.faint; g.beginPath(); g.arc(w - 18 + i * 3.4, B / 2, 0.55, 0, Math.PI * 2); g.fill(); }

  // The page itself: Skills, its three rows with their rules, the stream to their left (drawn alive by the shader).
  text(g, 'Skills', 128, B + 26, 15, '#efe0d2', { font: SANS, weight: 600, space: -0.02 });
  text(g, 'WHAT I BUILD WITH', 129, B + 39, 2.8, INK.dim, { font: SANS, weight: 600, space: 0.2 });
  const rows: [string, string[][]][] = [
    ['AI Product Engineering', [['Agents', 'Evals', 'Retrieval'], ['Prompt design', 'Tool use']]],
    ['Full-Stack Engineering', [['TypeScript', 'React', 'Node'], ['Postgres', 'WebGL']]],
    ['Design Systems & Craft', [['Tokens', 'Motion', 'Type'], ['3D', 'Accessibility']]],
  ];
  rows.forEach(([name, groups], i) => {
    const y = B + 62 + i * 70;
    g.fillStyle = '#3d3934';
    g.fillRect(118, y - 6, w - 136, 0.35);
    text(g, name, 128, y + 8, 5, '#e9d9c8', { font: SANS, weight: 600 });
    groups.forEach((items, k) => {
      let x = 128;
      for (const it of items) {
        const tw = text(g, it, x + 3, y + 22 + k * 11, 3.1, INK.prop, { font: SANS, weight: 450 });
        round(g, x, y + 22 + k * 11 - 3.6, tw + 6, 7.2, 3.6);
        g.strokeStyle = '#3a3632';
        g.lineWidth = 0.3;
        g.stroke();
        x += tw + 10;
      }
    });
    // The row's thing at the left, where the stream strikes it: a small chip in its socket, which the shader lights.
    const cx = 99, cy = y + 13;
    g.fillStyle = '#12110f';
    round(g, cx - 9, cy - 9, 18, 18, 1.6);
    g.fill();
    g.strokeStyle = '#4a4540';
    g.lineWidth = 0.3;
    g.stroke();
    g.fillStyle = '#6b645c';
    for (let k = 0; k < 5; k++) {
      const o = -4 + k * 2;
      g.fillRect(cx + o - 0.35, cy - 7.6, 0.7, 1.6); g.fillRect(cx + o - 0.35, cy + 6, 0.7, 1.6);
      g.fillRect(cx - 7.6, cy + o - 0.35, 1.6, 0.7); g.fillRect(cx + 6, cy + o - 0.35, 1.6, 0.7);
    }
    g.fillStyle = '#2a2724';
    round(g, cx - 5.6, cy - 5.6, 11.2, 11.2, 0.8);
    g.fill();
    g.fillStyle = '#8a5a30';
    round(g, cx - 3.2, cy - 3.2, 6.4, 6.4, 0.5);
    g.fill();
  });
  g.restore();
  windowGround(g, w, h, r, 'rgba(0,0,0,0)');
  return { c, top: h - B };
}

function drawPanel(): HTMLCanvasElement {
  const [w, h] = extent(LAYERS.panel.rect);
  const { c, g } = sheet(w, h, 4.8);
  const r = LAYERS.panel.round;
  g.save();
  round(g, 0, 0, w, h, r);
  g.clip();
  // Its ground is left mostly open: the shader lays a blur of what is behind under it.
  g.fillStyle = 'rgba(24, 22, 21, 0.8)';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(40, 37, 34, 0.85)';
  g.fillRect(0, 0, w, 10);
  g.fillStyle = INK.rule;
  g.fillRect(0, 10, w, 0.3);
  g.fillStyle = INK.fn;
  g.beginPath(); g.arc(6, 5, 1.2, 0, Math.PI * 2); g.fill();
  text(g, 'stream', 10, 5, 3.4, INK.pale, { font: SANS, weight: 600 });
  text(g, 'live · 120 fps', w - 5, 5, 2.9, INK.dim, { font: SANS, align: 'right' });
  const stats: [string, string][] = [['shards', '212'], ['riding', '148'], ['thrown', '64'], ['frame', '6.1 ms']];
  stats.forEach(([k, v], i) => {
    const y = 17 + i * 7;
    text(g, k, 6, y, 3.1, INK.dim, { font: SANS });
    text(g, v, 58, y, 3.3, INK.name, { align: 'right', weight: 500 });
  });
  // Frame times, a bar a frame.
  const gx = 6, gy = 72, gw = 56, gh = 18;
  g.fillStyle = '#201e1c';
  g.fillRect(gx, gy, gw, gh);
  for (let i = 0; i < 28; i++) {
    const v = 0.34 + 0.16 * Math.sin(i * 1.7) * Math.cos(i * 0.6) + (i === 19 ? 0.28 : 0);
    g.fillStyle = i === 19 ? INK.kw : INK.copper;
    g.globalAlpha = i === 19 ? 1 : 0.75;
    g.fillRect(gx + 1 + i * 1.95, gy + gh - v * gh, 1.3, v * gh);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#5a544d';
  g.fillRect(gx, gy + gh * 0.35, gw, 0.22);
  // The palette, as chips with their names.
  g.fillStyle = INK.rule;
  g.fillRect(70, 14, 0.3, h - 20);
  const chips: [string, string][] = [['ember', palette.ember], ['flame', palette.flame], ['hot', palette.hot], ['copper', palette.copper], ['bronze', palette.bronze], ['ground', palette['bg-3']]];
  chips.forEach(([name, ink], i) => {
    const col = i % 2, rr = Math.floor(i / 2), x = 78 + col * 56, y = 16 + rr * 25;
    round(g, x, y, 13, 13, 2);
    g.fillStyle = ink;
    g.globalAlpha = 0.62;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255, 227, 194, 0.18)';
    g.lineWidth = 0.3;
    g.stroke();
    text(g, name, x + 17, y + 4, 3.2, INK.name, { font: SANS, weight: 500 });
    text(g, ink, x + 17, y + 9.4, 2.7, INK.dim);
  });
  g.restore();
  windowGround(g, w, h, r, 'rgba(0,0,0,0)');
  return c;
}

function drawPointer(): HTMLCanvasElement {
  const s = LAYERS.pointer.size;
  const { c, g } = sheet(s, s, 24);
  g.beginPath();
  const p: [number, number][] = [[0.6, 0.6], [0.6, 8.6], [2.6, 6.8], [4.1, 9.9], [5.5, 9.3], [4.0, 6.2], [6.6, 6.1]];
  p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = '#f2dcc2';
  g.fill();
  g.strokeStyle = '#12110f';
  g.lineWidth = 0.5;
  g.lineJoin = 'round';
  g.stroke();
  return c;
}

export async function drawArt(wall: [number, number], maxAniso: number): Promise<Art> {
  if (typeof document !== 'undefined' && document.fonts) {
    await Promise.all([
      document.fonts.load(`450 20px ${MONO}`), document.fonts.load(`600 20px ${MONO}`), document.fonts.load(`italic 450 20px ${MONO}`),
      document.fonts.load(`500 20px ${SANS}`), document.fonts.load(`600 20px ${SANS}`),
    ]).catch(() => undefined);
  }
  const ed = drawEditor();
  const pg = drawPage();
  return {
    wall: texture(drawWall(wall[0], wall[1]), maxAniso),
    editor: texture(ed.c, maxAniso),
    page: texture(pg.c, maxAniso),
    panel: texture(drawPanel(), maxAniso),
    pointer: texture(drawPointer(), maxAniso),
    caret: ed.caret,
    pageTop: pg.top,
  };
}
