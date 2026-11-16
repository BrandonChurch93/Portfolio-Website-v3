# Your part: the towers. Round 2: keep the stepped tower, and build the city

## What you own
scripts/world/parts/towers/, public/world/tower*.bin and tower*.png (and towers*.bin, towers*.png), src/pieces/world/parts/towers.ts, src/pieces/world/parts/towers/. Stills in shots/world/towers/ with the prefix r2-. Report: shots/world/towers/r2-report.md.

## The stepped tower is approved in spirit: do not redesign it
Brandon put round 1's tower (shots/world/towers/final-close-beside.jpg, final-alone.png) beside the picture's small plain one and said: "I think the building on the right looks way better than the one on the left." So its design stays: the pale stone piers with their courses, the recessed bay of windows, the cornice and parapet, the five tier fluted gold crown with its little cornices, the lantern and point. A round that began turning it into the picture's plain block was stopped and undone. Fix only these real faults, and change nothing else about it:
1. The crown's reeds kink and waver at three times zoom under the stage's edge smoothing ("like corrugated cardboard"). Make them dead straight at every size.
2. The gold. METAL.gold in light.ts is now lighter (the palette's hot eased toward pale). Use it, and drop any step that washes gold toward grey: every gold pixel stays gold (saturation of about 0.35 or more), deep and saturated where it mirrors little, paling toward pale gold where it mirrors the moon's light.
3. The light has changed under you: the moon (MOONWARD) is now behind the world and to the viewer's right, and faces turned to the viewer are lit by a soft light the night has on the viewer's side (night.ts, `front`). Make the tower again and check it still reads at least as well as final-alone.png: pale piers on the front, a brighter side at the viewer's right, the crown the brightest thing.
4. At three times zoom a pane is nearly a flat color. Give the lit windows visible depth at that size (the room's back wall darker than its lamp, a sill line, a blind) without making the bay busier at the page's size.

## Then the city, in the same language and the same level of detail
Every building in TOWERS (src/pieces/world/placed.ts: x, z, w, d, tall, turn, form, roof, seed) that stands on the land (leave out any with within(x, z) < 0.6 * max(w, d): the tear took that ground). Its place, footprint and height are the layout and are exact. How it looks is yours, and the stepped tower is the standard: real massing (piers, recessed bays, setbacks, cornices), stone, bronze, glass and gold a stranger can name, windows that differ and have depth, light that lands on things.
- The named ones, which make picture 9's skyline (open reference/concept/09-parts/09c-the-skyline.jpg and 09d): TOWERS[0], form 'obelisk', the tallest after the spire, a slender tower ending in a tall gold point. TOWERS[2], form 'disc', a tower carrying a great gold sun disc on its top, carved as the site's Sun stones are (look at src/stream/stone.ts for what a Sun stone is: rings, rays and a boss, no face). TOWERS[3], [4], [5], form 'point' with gold roofs: towers with gold caps. `npm run match` prints where each of these tops must be in the picture.
- The rest: forms 'deco', 'slab', 'point', 'twin', 'fin', 'hall', 'dome' with roofs 'gold', 'bronze' or 'plain'. Make about twelve designs in all, each working at any width, depth and height it is given, each with its own seed so no two neighbours are alike. Take character from the picture's skyline: stepped setbacks, towers banded with copper rings, a tower that flares to a wide head, twin shafts joined by bridges, low halls and domes among the tall ones. Gold only where roof is 'gold', bronze or copper accents where 'bronze'.
- The city is warm and lit: windows in clumps, with busy and quiet buildings, never a checkerboard.

## How it must be made
- One make for the whole city (keep step.mjs's own make working too): every building generated, then lit together, so neighbours shade each other and lit windows warm the walls across the street (emit), then packed as a few meshes, one per material. At most 6 draw calls, 4 shader programs, 700,000 triangles and 16 MB of textures for the whole city. Windows by a map with a texel per window, as now.
- towers.ts returns `stands`: the places in TOWERS of every building you draw, so the plain stand ins leave those out (see part.ts).
- Nothing may sparkle, crawl or show moire at the page's size or smaller: fade what is finer than a pixel to its average, as the stepped tower's bay does.

## First look, every round
npm run match -- --at 60,0,1260,330 --out shots/world/towers/r2-match (the skyline laid over the picture). Tops and outlines sit where the picture has them. Then npm run look -- crown, close:crown, and npm run look -- whole.

## Order of work
The stepped tower's four fixes first. Then the pipeline for many buildings with the three named gold ones. Then as many of the other designs as you can bring to the stepped tower's standard. A design that is not at that standard is left as a stand in (leave its buildings out of `stands`) and named in your report: a half made building on the page is worse than a plain dark box.
