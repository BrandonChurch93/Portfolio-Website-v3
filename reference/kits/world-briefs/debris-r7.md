# Your part: what broke away. Round 7: round 6's masses, in the planet's own stone and the world's own light

## What you own
scripts/world/parts/debris/, public/world/debris*.bin, src/pieces/world/parts/debris.ts, src/pieces/world/parts/debris/. Stills in shots/world/debris/ with the prefix r7-. Report: shots/world/debris/r7-report.md. Read first: shots/world/debris/r6-report.md and its two reviews (r6-report-review-1.md, -2.md), and the END of briefs/common.md.

## Where it stands, told plainly
What is live and in git is still ROUND 4: sparse near black pieces with warm lit edges, and its faults (thin bright planks and slivers, an empty field). Round 5 and round 6 were not kept. Your working files are round 6's, and round 6 is also on the branch kept/debris-r6.
Round 6 scored 4.5 and 5. Fable, with shots/world/debris/r6-vs-r4.jpg open (round 4, then round 6, on the page): round 6 has the FORMS (craggy masses with a lit side and a dark side by how their faces turn, no plank, no box stack, no rim bands, a field with weight in it) and round 4 has the LIGHT (near black bodies with a warm lit edge, which is what picture 9's boulders are). Round 6's masses are a pale grey in a warm scene and read as low poly rocks from a game. Neither is plainly better than the other, so round 4 stays live until one round is.

Kept, and not to be lost: the composition (big masses high under the planet's sides, smaller with depth, the stream's lane clear, the core unhidden). Slow heavy motion with families moving together and nothing popping. One draw call, one program of its own.

Brandon's words, which this part answers to: the debris field is "super important", one scene, and his test is a high end film or a AAA game.

## What must change, most important first
1. ONE STONE. Every piece is the hollow's stone: stone() in light.ts, with the rock's own relief language (read src/pieces/world/parts/rock/stone.ts as it is now, and the rock's round 6 report for what it stores per vertex). Take out the greying: MOON_PARS lights the great pieces with an albedo taken 35 percent toward grey (dPale) and COLOR greys old faces, so G1 measures (57, 42, 31) against the hollow rock's (112, 63, 36). A stranger should see pieces of THAT planet.
2. THE WORLD'S LIGHT AND NO OTHER. Near black bodies with a lit broken rim, as picture 9's boulders have, from the lights that exist: the moon behind the world and to the right (a pale rim on upper right edges), the core for what is near the hollow (paler near the ball since 05:45, common.md), and the page's stream for what is near its line (world.uniforms.uStream, multiplied by its x and never further down than its y). Take out boulderLit's up light and its side light: they come from no source in the world. A lit face is never one tone: it falls off across the face and breaks on the relief.
3. AT THREE TIMES IT IS ROCK. The great pieces and boulders are smooth broad planes with soft gradients, pencil stroke scars and cubes stuck on faces: "rock that is faceted" is on the fail list. Strata, grit, pits and granular broken lips at every scale, so no lit face holds one tone (one pale face measures red 46 to 51 across 130 pixels). A gouge is a break that cuts the form, with a lit lip and a shadowed riser, never parallel dark strokes (wood grain is on the fail list too).
4. THE TWO BOULDERS, to picture 9's weight (shots/world/debris/r6-boulders.jpg and your overlay). The right one is a thin lit tray round a flat black middle: the picture's is a thick wedge, about 130 to 340 down on the overlay. The left one is a pale cube corner with a flat top: widen it about 35 picture pixels to the right (it ends near 461, the picture's at 497) and break its right angles. Both: dark granular masses with a torn lip.
5. THE SMALL AND MIDDLING PIECES are clean five and six sided prisms with one flat saturated orange face each and a cork like pore mottle. Vary the cuts, chip the edges, grade the core's light across each face. They are the same stuff as the stream's shards where the stream carries them (src/stream/shards.ts).
6. FAULTS. G1's square dark pocket, the hard black bar on the upper right cluster, the square punched chips with no lip, the bright slivers on the boulders' outer edges, the staircase along the left cluster's crease and on pale outlines against black (common.md, thin lit edges).
7. THE FIELD'S SHAPE. It ends in a hard lower edge with almost no tail, its arms read as a mirrored W, and two orphan puffs of dust float at its upper corners. A thinning tail of clumps and dust under it, arms that curl and differ left from right, no orphan puffs.

## The rock is changing under you
The rock is in its seventh round: its torn edges are being made ragged, and under the hollow's floor there is to be dim rock (the far inner wall of the planet, well behind the core). Make your part again from public/world/rock-r.bin as it is when you start and again before your last stills, and say in your report which rock you made it against.

## Budget
2.1 MB at the most for debris.bin, 170,000 triangles, one draw call, one program of its own.

## How to look
Every draft: the real page first (npm run shot -- "/lab/hero?ui=0" --scroll 1000 --t 9 --wait 12000 and --scroll 700), laid beside round 4's and round 6's as r6-vs-r4.jpg was. Then close:debris at three times, left cluster and right great piece. Then real frames (npm run live) for the motion. It is kept only if it is plainly better than round 4 at the page's size: say so yourself, harshly, with the two side by side.
