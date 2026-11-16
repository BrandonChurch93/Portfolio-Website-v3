// Makes sculpt B of the rock and writes public/world/rock-b.bin.
//
//   node scripts/world/parts/rock-b/make.mjs           the shipped file
//   node scripts/world/parts/rock-b/make.mjs --draft   fast and rough
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { makeRock } from '../../lib/rock.mjs';

await makeRock({ name: 'b', module: fileURLToPath(new URL('./field.mjs', import.meta.url)), cell: 2.5, draft: process.argv.includes('--draft') });
