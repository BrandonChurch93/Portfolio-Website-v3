// Makes sculptor A's torn rock: node scripts/world/parts/rock-a/make.mjs [--draft]
import { fileURLToPath } from 'node:url';
import { makeRock } from '../../lib/rock.mjs';

await makeRock({ name: 'a', module: fileURLToPath(new URL('./field.mjs', import.meta.url)), cell: 3, draft: process.argv.includes('--draft') });
