// A still of any page, in a known state.
//
//   npm run shot -- <route> [options]
//
//   --vp phone|tablet|tablet-wide|desktop|wide|4k   screen size (default desktop)
//   --out <file>                        where to save (default shots/<route>-<vp>.jpg)
//   --full                              the whole page, not only the first screen
//   --t <seconds>                       hold every animation at this time
//   --opening                           with --t, the time is seconds into the page's opening
//   --lamp <x,y>                        hold the cursor light at this point of the screen, 0 to 1
//   --scroll <id | pixels | n%>         scroll to an element, a position or a fraction of the page
//   --piece <name> --view <az,el,dist>  place that piece's camera for a close look
//   --piece <name> --progress <0..1>    set that piece's scroll progress
//   --hover <selector>                  move the pointer onto that element, from its left
//   --eval <js>                         run this in the page first. $t is replaced by the time
//   --nofreeze                          with --t or a strip's times, pass the time to --eval only and leave the clock running
//   --tier high|mid|low|static          force a quality tier
//   --scale <n>                         pixel ratio, overriding the screen size's own
//   --wait <ms>                         wait this long before capturing
//   --url <base>                        use a site that is already running somewhere else
//   --headed  --png
//
// It uses the dev server on port 5330 if one is running, and starts one if not.
// It prints whether the picture was drawn by a real graphics card or in software. Software is fine for form,
// layout and color. It is not a fair test of motion or speed.
import process from 'node:process';
import { apply, browser, defaultOut, grab, open, parseArgs, renderer, save, server } from './lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const route = rest[0];
if (!route) { console.error('usage: npm run shot -- <route> [--vp desktop] [--out file] [--full] [--t s] [--lamp x,y] ...'); process.exit(1); }

const srv = await server(flags);
const b = await browser(flags);
const errors = [];
try {
  const page = await open(b, srv.base, route, flags, errors);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  await apply(page, flags);
  const out = flags.out ?? defaultOut(route, flags);
  save(out, await grab(page, flags));
  console.log(`shot: ${out}`);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
