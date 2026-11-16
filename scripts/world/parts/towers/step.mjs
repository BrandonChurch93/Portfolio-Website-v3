// The tower with the stepped gold crown alone (TOWERS[STEP] in src/pieces/world/placed.ts), made ahead and shipped:
// public/world/tower-step.bin, its geometry and baked light, and public/world/tower-step-windows.png, the state of
// every window. Its neighbours stand round it in the bake as plain blocks. The city's make (./city.mjs) builds it
// with every other building; this one is for working on it alone (towers.ts: ?towers=step).
//
//   node scripts/world/parts/towers/step.mjs [--draft]
import { P } from '../../lib/plan.mjs';
import { layers } from './layers.mjs';
import { finish } from './make.mjs';
import { occluders, placeOf } from './site.mjs';
import { stepTower } from './step-form.mjs';
import { Windows } from './windows.mjs';

const draft = process.argv.includes('--draft');
const [X0, Z0, , , , TURN, , , SEED] = P.TOWERS[P.STEP];
const win = new Windows(Math.round(SEED * 1e6)), kit = layers();
stepTower(kit, win, draft);
await finish({ made: kit.meshes(placeOf(X0, Z0, TURN)), win, around: occluders(P.STEP, X0, Z0), file: 'tower-step', draft, meta: { design: 'step' } });
