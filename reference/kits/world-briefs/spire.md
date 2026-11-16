# Your part: the spire

## What you own
scripts/world/parts/spire/, public/world/spire*.bin and spire*.png, src/pieces/world/parts/spire.ts (replace the place holder, keep `build`), src/pieces/world/parts/spire/. Stills in shots/world/spire/. Report: shots/world/spire/r1-report.md.

## What it is
The tallest thing in the world, on the hero's center line, straight under Brandon's name: SPIRE in layout.ts (250 tall, 38 wide at its foot, standing at the origin on a court of radius COURT) with one thin gold ring near its top, tilted as Saturn's is (ring: radius 54, 2.4 thick, at 0.74 of its height, tilted 9 and 17 degrees). In the picture its tip is at 685 across and 20 down. Pictures: reference/concept/09-parts/09c-the-skyline.jpg (the tall dark tower at the middle with the ring), the whole picture. The kit: "A person can name what it is built of."

## The standard
The tower with the stepped gold crown, which Brandon likes ("looks way better" than the picture's): open shots/world/towers/final-alone.png and read src/pieces/world/parts/towers/materials.ts and scripts/world/parts/towers/ (kit.mjs, step.mjs) to see how it is made: real massing by script, stone piers, a recessed bay of windows drawn in the material with a room behind each, bronze, gold, stored light with the windows as light. The spire must be plainly of the same city and plainly finer, since it is the tallest thing and stands under his name. Copy what you need of those files' ideas into your own folder: do not import from the towers' folder and do not change it.

## What Fable wants built
- A slender tower that tapers in stages from a broad stepped foot to a needle: buttressed base with tall portals, a long shaft of piers and lit bays, three or four setbacks each with its own small crown, an open lantern stage near the top through which the night shows, then a long needle of bronze and gold. Its outline against the sky is the thing: at the page's size it must be the most elegant outline in the city, and the spire's tip must be exactly at its planned height.
- The ring: one thin ring of polished gold, hanging free round the shaft with nothing holding it, tilted as planned. It is a real object: a fine profile (not a plain torus), with a hairline of engraving, catching one bright glint where it turns to the moon. It casts its shadow on the shaft.
- The court at its foot: a round plaza of finer paving, radius COURT, with a low stepped edge.
- Lit windows in clumps, warmer and more of them than on its neighbours. A few small lights at the lantern.
- Gold is METAL.gold from light.ts. lit(m, { key, baked: true, core: false }), glint: true on gold.

Budget: 60,000 triangles, 4 shader programs, 8 MB of textures.

## First look, every round
npm run match -- --at 560,0,260,300 --out shots/world/spire/match: its outline, its tip (685, 20) and its ring sit on the picture's. Then npm run look -- only:spire --w 900 --h 1500, and npm run look -- whole.
