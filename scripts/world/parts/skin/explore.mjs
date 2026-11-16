import { L } from '../../lib/plan.mjs';
import { tornAt } from '../rock-r/relief.mjs';
const P = (th, t) => L.pictured(...L.skinAt(th, t));
for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1]) {
  const row = [];
  for (const deg of [-110, -100, -90, -80, -70, -60, -50, -40, 30, 40, 50, 60, 70, 80, 90, 100]) { const [x, y] = P(deg * L.D2R, t); row.push(`${deg}:${x.toFixed(0)},${y.toFixed(0)}`); }
  console.log(t, row.join(' '));
}
console.log('RIM', L.RIM, 'torn', tornAt('left', 470), tornAt('right', 470));
