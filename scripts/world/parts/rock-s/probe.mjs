// Sculpt S, one mass's field along the line of sight through a place of the picture: for finding why a mass is
// missing.  node scripts/world/parts/rock-s/probe.mjs <px> <py>
import { L } from '../../lib/plan.mjs';
import * as F from './field.mjs';
F.setup({});
const [px, py] = process.argv.slice(2).map(Number);
let line = '';
for (let z = 700; z > -200; z -= 6) { const p = L.fromPicture(px, py, z), d = F.field(...p); line += d < 0 ? '#' : d < 3 ? '+' : '.'; }
console.log(line);
