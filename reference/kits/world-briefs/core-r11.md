# Your part: the core. Round 11: a beam that is the stream, and a face that is light

## What you own
src/pieces/world/parts/core.ts and src/pieces/world/parts/core/. Stills in shots/world/core/ with the prefix r11-. Report: shots/world/core/r11-report.md. Read first: shots/world/core/r10-report.md and its two reviews (r10-report-review-1.md, -2.md), and the END of briefs/common.md (About 06:10 is what Fable changed on the page's side for the waist you found, and About 05:45 is the core's light on the rock).

## Where it stands (round 10 is committed: git has it, so you can always get back to it)
Round 10 scored 6 and 5.5 and Fable kept it. Kept, and not to be lost: the ball's place, size and hard narrow deep orange band on picture 9 (688, 437, r 89). The face free of crazing, blotches, outlines and terrazzo. The flare at the foot, where the band runs into the beam as one shape. Light that travels down the beam at the stream's pace. Nothing outside the outline, nothing off the palette. 2 meshes, 2 programs, 9,030 triangles, uniforms only, no warnings.

The waist you found at 230 to 255 was the page's, as you said, and is mended there: the page's heart now opens by width from a bright thread (shots/world/frame/join-thread.jpg). Your half of it is item 1.

## What must change, most important first
1. THE NECK MEETS A THREAD. Across 221 to 261 units under the foot your neck's heart narrows to the page's thread (0.3 of the stream's heart, about half a unit) and ends inside it at full light. It does not fade by light there and does not end in a flat square bottom. Above that its top is the ball's own cream: a crisp edged fillet curving out of the band in the face's color, warming to the stream's heart lower down. Take out the soft edgeless orange fan that lies over the rock at the foot.
2. NOT A TUBE WITH BEADS. Between pulses the beam is an even glowing rod with a pale centre line (a tube fails on sight), and the pulses are identical lens shaped beads sliding down it: "drops in a liquid column", "a neon chaser". The stream is strands (reference/studies/06-stream-core.jpg, and src/stream/shaders.ts, coreFrag, is how the page draws its own): the beam is a few strands that twist round each other and vary in light along their length, braiding into the page's strands where they gather over the 170 units after the join. What runs down it is uneven: surges of very different length, sharpness and light, some that smear, some that split along a strand. The motion keeps its character across the join.
3. THE FACE IS LIGHT, NOT A PAINTED DISC. At three times it is a matte sponge painted speckle of flat round discs (sandstone, cork). Give the grain light: a share of grains as facets that glint by angle or shimmer slowly, depth under the surface, an inner glow. Hold the cream further out, so the deeper gold is one narrow band at a hard edge as picture 9's is, and not the whole outer third (a yolk, a biscuit).
4. THE CONVECTION can be seen in a filmstrip of 0 to 42 s at the page's size, or it is cut. Eight frames that cannot be told apart are a cost for nothing.
5. SOMETHING OF THE STREAM RIDES THE BEAM near the ball: a few of the stream's own shards (src/stream/shards.ts are their shapes), well made, in the stream's copper and glass, starting sparse under the flare and thickening toward the join, so the beam is tied to the stream below it. Not the lumps of rounds 4 to 9: if they cannot be made to read as the stream's shards at the page's size, leave them out and say so.

## Budget
As it is: uniforms only, no textures, no geometry rewritten per frame, 16.7 ms a frame.

## How to look
Every draft: the real page at scroll 760 and 1000 (npm run shot -- "/lab/hero?ui=0" --scroll 1000 --t 9 --wait 12000), cut to the beam from the ball's foot to 400 units under it, beside round 10's. Then real frames at rest at scroll 1000 (npm run live). Then the face at three times beside the picture's. From across the room: one object from the ball to the stream, with no place the eye can say "here one thing ends and another begins".
