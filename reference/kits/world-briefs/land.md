# Your part: the land

## What you own
scripts/world/parts/land/, public/world/land*.bin and land*.png, src/pieces/world/parts/land.ts (replace the place holder, keep `build`), src/pieces/world/parts/land/. Stills in shots/world/land/. Report: shots/world/land/r1-report.md.

## What it is
The top of the planet: everything the city, the trees, the pyramid and the spire stand on, and the desert. Pictures: reference/concept/09-parts/09g-the-dunes.jpg, 09c-the-skyline.jpg, the whole picture, and reference/concept/04-gemini-the-top-he-likes-with-a-ring-and-large-dunes.jpg, whose dunes are the standard for the dunes (one of the four agreed changes: "The dunes are in picture 9's place and size, and as good as picture 4's: a sharp crest, and a hollow face in full shadow").

## The layout (exact)
- The land's height is ground(x, z) in layout.ts (a nearly flat dome, plus the dunes in the desert). Its edge is within(x, z) = 0: the rim all round, and at the front the deep bite of lip(x), read off the picture. The rock's own part makes the broken face under that edge: your sheet ends exactly on the line, with a thin turned down edge so no gap can show.
- The desert is the right end of the top (desert(x, z), DESERT). In the picture the dunes run from 930 to 1270 across. dunes() in layout.ts is the study's dune field: lay it over the picture first. If the picture's dunes are somewhere else or another size, the picture wins: build your own dune field in your own files to the picture's place, and say exactly what differs in your report.
- The city's ground: the spire's court (COURT, radius 56 at the middle), the pyramid's ground (PYRAMID), the buildings (TOWERS in placed.ts) and the belt of trees (TREES) along the city's front, between the buildings and the lip.

## What Fable wants built
1. The dunes: the best thing on the land. Long sharp crests that curve, a low wide back toward the moon and a steep hollow face away from it that lies in full shadow (the moon is behind the world to the viewer's right: MOONWARD), each dune standing in a hollow lower than the sand round it, crests that fork and fade. Fine ripples across the backs that show at three times zoom and fade below a pixel. Pale gold sand in the moon's light, deep warm brown in shadow, never grey and never yellow.
2. The city's ground: dark paved stone with real joints, laid in courts and streets that follow the buildings (a street between neighbours, a court before a great tower), a low kerb where paving meets grass, a ring of finer paving round the spire. It is seen nearly edge on, at 6 degrees, so its job is to catch a little light, take the buildings' shadows and their window light, and never be one flat color.
3. The belt: dry grass in the palette's autumn browns under the trees along the city's front, soft and uneven at its edge, with a few flat stones.
4. The land's broken front: where it nears the lip the paving and grass crack and step down a little toward the edge, with slabs tipped, as ground does at a break.
5. Light: the moon's shadows come from the stage's shadow map (receiveShadow). Store with the mesh how open each place is and the light that has bounced, with the buildings as blockers and their lit windows as light (use TOWERS as boxes with emit on their faces, weak and warm), so the ground is darker between towers and warm near them.

## How
A height field made by your script (fine where the dunes are, coarser on the city's ground), with stored light, and maps written by your script for the sand's ripples and the paving (or worked out in the shader with proper filtering). lit(m, { key, baked: true, core: false }). Budget: 200,000 triangles, 3 shader programs, 16 MB of textures.

## First look, every round
npm run match -- --at 60,200,1260,140 --out shots/world/land/match (the land's edge and the dunes laid over the picture) and npm run match -- --at 880,220,420,110 --out shots/world/land/match-dunes. Then stills of the dunes at three times: add a close view yourself with npm run look -- whole and a crop, or ?only=land.

## Added by Brandon after this was written (Nov 15, 22:58)
"I want the sand dunes to be sharper. Take a look at this image from my earlier iteration. To me, it looks much better than the current iteration." His picture is shots/world/ref/dunes-he-likes.png: open it. That is the dune he wants: crescents with knife sharp crests, each with a steep hollow face in deep, near black shadow whose outline is crisp, smooth pale backs, the crest line itself catching light. The soft rounded mounds of the plan's dunes() are what he does not want. Judge the dunes beside that picture first.
