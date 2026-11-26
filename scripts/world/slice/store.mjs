// What the ray caster gave, kept in one file between runs, so the look can be worked on without casting again.
//   save('shots/slice/rock.trace', traced)     load('shots/slice/rock.trace')
// The file is a line of JSON (the size, the window and where each array is) and then the arrays, as 32 bit floats.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const NAMES = ['cover', 'depth', 'normal', 'face', 'core', 'open', 'bounce', 'moon', 'line', 'tone', 'albedo', 'lit', 'near'];

export function save(file, t, more = {}) {
  const parts = [], at = {};
  let offset = 0;
  for (const name of [...NAMES, ...Object.keys(more)]) {
    const a = more[name] ?? t[name];
    if (!a) continue;
    at[name] = [offset, a.length];
    parts.push(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
    offset += a.byteLength;
  }
  const head = Buffer.from(JSON.stringify({ W: t.W, H: t.H, window: t.window, at, stats: t.stats }) + '\n');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([head, ...parts]));
  console.log(`store: ${file} · ${((head.length + offset) / 1048576).toFixed(1)} MB`);
}

export function load(file) {
  const raw = readFileSync(file), end = raw.indexOf(10), head = JSON.parse(raw.subarray(0, end).toString('utf8'));
  const out = { W: head.W, H: head.H, window: head.window, stats: head.stats };
  for (const [name, [offset, n]] of Object.entries(head.at)) {
    const a = new Float32Array(n);
    Buffer.from(a.buffer).set(raw.subarray(end + 1 + offset, end + 1 + offset + n * 4));
    out[name] = a;
  }
  return out;
}
