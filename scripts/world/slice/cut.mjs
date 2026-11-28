// Films of one page taken two ways (./film.mjs), set beside each other as one film: the same part of each, each under
// its name, the frames in step.
//
//   node scripts/world/slice/cut.mjs --out shots/slice/film/beside.mp4 [--fps 24] [--part 320,0,800,900] [--font f.ttf]
//     "Today=shots/slice/film/today" "New=shots/slice/film/new"
//
//   --part x,y,w,h   the part of every frame that is kept (its pixels). Default: all of it
//   --font           a font file for the names. Default: whatever the machine calls Sans
//   --quality        x264's constant quality, lower is finer. Default 14
//
// It needs ffmpeg. The film plays at the rate the frames were taken at: nothing is added between them.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { parseArgs } from '../../lib.mjs';
import { palette } from '../../../src/config/palette.ts';

const { flags, rest } = parseArgs(process.argv.slice(2));
if (!flags.out || rest.length < 2) { console.error('usage: node scripts/world/slice/cut.mjs --out film.mp4 [--fps 24] [--part x,y,w,h] "Name=folder" "Name=folder"'); process.exit(1); }
const fps = Number(flags.fps ?? 24), part = flags.part ? String(flags.part).split(',').map(Number) : null;
const sides = rest.map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), folder: s.slice(i + 1) }; });
for (const s of sides) s.count = fs.readdirSync(s.folder).filter((f) => /^f\d{4}\.png$/.test(f)).length;
const count = Math.min(...sides.map((s) => s.count));
if (!count) { console.error('ERROR: a folder has no frames'); process.exit(1); }

const hex = (c) => `0x${c.replace('#', '')}`, font = flags.font ? `fontfile=${flags.font}` : 'font=Sans';
const named = sides.map((s, i) => `[${i}:v]${part ? `crop=${part[2]}:${part[3]}:${part[0]}:${part[1]},` : ''}drawtext=${font}:text='${s.name}':x=28:y=24:fontsize=22:fontcolor=${hex(palette.pale)}@0.92:box=1:boxcolor=${hex(palette.bg)}@0.6:boxborderw=10[s${i}]`);
const graph = `${named.join(';')};${sides.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${sides.length},format=yuv420p[v]`;
const args = ['-y', '-loglevel', 'error', ...sides.flatMap((s) => ['-framerate', String(fps), '-i', `${s.folder}/f%04d.png`]), '-frames:v', String(count), '-filter_complex', graph, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(flags.quality ?? 14), '-movflags', '+faststart', flags.out];
const done = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (done.status !== 0) { console.error('ERROR: ffmpeg did not finish'); process.exit(1); }
console.log(`film: ${flags.out} · ${count} frames at ${fps} a second · ${(count / fps).toFixed(2)} s · ${(fs.statSync(flags.out).size / 1e6).toFixed(1)} MB`);
