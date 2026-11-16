# Your part: the core. Round 12: the picture's broad pale column, and a face that is alive

## What you own
src/pieces/world/parts/core.ts and src/pieces/world/parts/core/. Stills in shots/world/core/ with the prefix r12-. Report: shots/world/core/r12-report.md. Read first: shots/world/core/r11-report.md and its two reviews (r11-report-review-1.md, -2.md), and the END of briefs/common.md (About 07:15 is the page's side of the join, which you were right about again).

## Where it stands (round 11 is committed: git has it, so you can always get back to it)
Round 11 scored 6 and 5.5 and Fable kept it: with the page's heart starting whole (shots/world/frame/join-cut.jpg) the ball pours out as a fillet and runs on into the stream with no waist, one object from the ball to the stream. Kept, and not to be lost: the ball's place, size and hard outer edge on picture 9 (688, 437, r 89). The fillet: the band runs off the ball and down the neck as one shape with no seam. The neck's strands, uneven surges and riding shards at three times, which tie it to the stream. The face's measured mean and fine variation (241, 217, 159) with nothing white or blue. The convection cut. 4 meshes, 3 programs, 4 draw calls, 9,530 triangles, uniforms only.

## What must change, most important first
1. THE COLUMN IS THE PICTURE'S. Ours is about 12 picture pixels of pale inside a 35 pixel orange flare with a dark amber outline down both sides, so the upper neck reads as a liquid in a glass funnel (honey, custard) and the ball as "a disc on a pin". The picture's is a broad pale pour, about 24 pixels of pale at the ball with no orange edge, narrowing gently to about 6 by 110 pixels down. Light, not liquid: no outline on its sides below about 40 units, its edge soft into the dark, strands inside it.
2. PALE ALL THE WAY TO THE JOIN. From about 100 units down the neck is narrower and less pale than the picture's, and at the page's size the cream cone ends in a step of width and color into a thin wire. Carry the pale heart down, never narrower than the page's own heart (measure it on the page: about a unit at half height), to 221 units, and end it a few units under the page's start. No single height where width and color both change.
3. THE FACE IS ALIVE AND MADE OF LIGHT. At three times it is cornmeal, sponge, terrazzo: soft pale blobs with five sided flecks DARKER and more golden than the ground, which read as dirt. A fleck is only ever brighter or hotter than the face. Fable's ruling on headroom, which both reviewers asked for: lower the face's ground a few levels (it sits within 10 of the stage's brightest) so a fine even fizz can stand above it. And something on it moves at the page's size: a slow drift of broad light, 5 to 8 levels, at a scale larger than the speckle, with no blotches. Eight frames of a filmstrip from 0 to 42 s must not be identical.
4. THE BAND is one narrow deep orange line at a hard edge, from 0.93 of the radius to the edge (at 0.94 ours is 236, 178, 100 against the picture's 224, 154, 64, and it fades in from 0.85), with a soft gold fall inside it. Not a two tone crease and lip like a plate's rim.
5. SET OFF is a burst and not a pointed drip (an upside down map pin).
6. THE RIDERS are beige flat slivers close up and dust at the page's size, and one parks on the beam's middle as a dark knot in real frames. Dark copper with sharp lit edges as the stream's own shards are (src/stream/shards.ts), a few large enough to read as shapes on the page, none on the beam's middle. Or drop them at the page's size.

## Budget
As it is: uniforms only, no textures, nothing rewritten per frame, 16.7 ms a frame.

## How to look
Every draft: the real page at scroll 760, 900 and 1000 (npm run shot -- "/lab/hero?ui=0" --scroll 900 --t 9 --wait 12000), cut to the beam from the ball's foot to 400 units under it, beside round 11's and picture 9's. Then real frames at rest (npm run live). Then the face at three times beside the picture's, and the filmstrip of item 3.
